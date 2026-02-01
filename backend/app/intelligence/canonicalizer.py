"""
Entity Canonicalizer

Provides single source of truth for entities by:
- Deduplicating IOCs across articles
- Merging threat actor aliases
- Normalizing TTP references
- Updating occurrence counts
- Tracking first/last seen timestamps

Ensures data consistency and enables efficient querying.
"""

from datetime import datetime
from typing import Dict, List, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.core.logging import logger
from app.models import IOC, ArticleIOC
from app.models_agentic import (
    ThreatActor, TTP, ArticleActorMap, ArticleTTPMap,
    EntityEvent
)


class EntityCanonicalizer:
    """
    Canonicalizes entities to ensure single source of truth.
    
    Handles:
    - IOC deduplication (value + type)
    - TTP normalization (MITRE ID)
    - Threat actor merging (name + aliases)
    - Occurrence tracking
    - Timeline events
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    async def canonicalize_all(
        self,
        article_id: int,
        extracted_entities: Dict,
        extraction_run_id: int
    ) -> Dict:
        """
        Canonicalize all extracted entities for an article.
        
        Returns:
            Dict with canonical entity counts and IDs
        """
        entities = extracted_entities.get("entities", {})
        
        # Canonicalize each entity type
        iocs_result = await self.canonicalize_iocs(
            article_id=article_id,
            iocs=entities.get("iocs", []),
            extraction_run_id=extraction_run_id
        )
        
        ttps_result = await self.canonicalize_ttps(
            article_id=article_id,
            ttps=entities.get("ttps", []),
            extraction_run_id=extraction_run_id
        )
        
        actors_result = await self.canonicalize_actors(
            article_id=article_id,
            actors=entities.get("actors", []),
            extraction_run_id=extraction_run_id
        )
        
        # Calculate summary statistics
        total_count = (
            iocs_result["count"] +
            ttps_result["count"] +
            actors_result["count"]
        )
        
        avg_confidence = 0
        all_confidences = (
            iocs_result.get("confidences", []) +
            ttps_result.get("confidences", []) +
            actors_result.get("confidences", [])
        )
        if all_confidences:
            avg_confidence = sum(all_confidences) / len(all_confidences)
        
        return {
            "iocs_count": iocs_result["count"],
            "iocs_ids": iocs_result["ids"],
            "ttps_count": ttps_result["count"],
            "ttps_ids": ttps_result["ids"],
            "actors_count": actors_result["count"],
            "actors_ids": actors_result["ids"],
            "total_count": total_count,
            "avg_confidence": avg_confidence,
            "critical_iocs_count": iocs_result.get("critical_count", 0),
            "exploitation_ttps_count": ttps_result.get("exploitation_count", 0)
        }
    
    async def canonicalize_iocs(
        self,
        article_id: int,
        iocs: List[Dict],
        extraction_run_id: int
    ) -> Dict:
        """
        Canonicalize IOCs - deduplicate and update occurrence tracking.
        
        For each IOC:
        1. Check if exists (value + type)
        2. If exists: update last_seen, increment count
        3. If new: create new IOC record
        4. Create article-IOC mapping
        5. Create timeline event
        """
        canonical_ids = []
        confidences = []
        critical_count = 0
        
        for ioc_data in iocs:
            value = ioc_data.get("value")
            ioc_type = ioc_data.get("type", "unknown")
            confidence = ioc_data.get("confidence", 50)
            evidence = ioc_data.get("evidence", "")
            extracted_from = ioc_data.get("extracted_from", "original")
            
            if not value:
                continue
            
            # Normalize value
            value = value.strip().lower() if ioc_type in ["domain", "email", "url"] else value.strip()
            
            # Check if IOC exists
            existing_ioc = self.db.query(IOC).filter(
                IOC.value == value,
                IOC.ioc_type == ioc_type
            ).first()
            
            if existing_ioc:
                # Update existing IOC
                existing_ioc.last_seen_at = datetime.utcnow()
                existing_ioc.occurrence_count += 1
                # Update confidence if higher
                if confidence > existing_ioc.confidence:
                    existing_ioc.confidence = confidence
                ioc_id = existing_ioc.id
            else:
                # Create new IOC
                new_ioc = IOC(
                    value=value,
                    ioc_type=ioc_type,
                    confidence=confidence,
                    first_seen_at=datetime.utcnow(),
                    last_seen_at=datetime.utcnow(),
                    occurrence_count=1
                )
                self.db.add(new_ioc)
                self.db.flush()  # Get ID
                ioc_id = new_ioc.id
            
            # Create article-IOC mapping (if not exists)
            existing_mapping = self.db.query(ArticleIOC).filter(
                ArticleIOC.article_id == article_id,
                ArticleIOC.ioc_id == ioc_id
            ).first()
            
            if not existing_mapping:
                mapping = ArticleIOC(
                    article_id=article_id,
                    ioc_id=ioc_id,
                    extracted_at=datetime.utcnow(),
                    extracted_by="genai",
                    confidence=confidence,
                    evidence=evidence,
                    context=extracted_from
                )
                self.db.add(mapping)
                
                # Create timeline event
                event = EntityEvent(
                    entity_type="ioc",
                    entity_id=ioc_id,
                    event_type="article_mention",
                    event_date=datetime.utcnow(),
                    article_id=article_id,
                    extraction_run_id=extraction_run_id,
                    confidence=confidence,
                    context=f"Extracted from {extracted_from}",
                    created_at=datetime.utcnow()
                )
                self.db.add(event)
            
            canonical_ids.append(ioc_id)
            confidences.append(confidence)
            
            # Count critical IOCs (hashes, IPs with high confidence)
            if ioc_type in ["hash", "ip"] and confidence > 80:
                critical_count += 1
        
        self.db.commit()
        
        logger.info("iocs_canonicalized",
                   article_id=article_id,
                   count=len(canonical_ids),
                   critical=critical_count)
        
        return {
            "count": len(canonical_ids),
            "ids": canonical_ids,
            "confidences": confidences,
            "critical_count": critical_count
        }
    
    async def canonicalize_ttps(
        self,
        article_id: int,
        ttps: List[Dict],
        extraction_run_id: int
    ) -> Dict:
        """
        Canonicalize TTPs - normalize MITRE references.
        
        For each TTP:
        1. Check if exists (MITRE ID)
        2. If exists: update last_seen, increment count
        3. If new: create new TTP record
        4. Create article-TTP mapping
        5. Create timeline event
        """
        canonical_ids = []
        confidences = []
        exploitation_count = 0
        
        for ttp_data in ttps:
            mitre_id = ttp_data.get("mitre_id")
            name = ttp_data.get("name", "")
            confidence = ttp_data.get("confidence", 50)
            evidence = ttp_data.get("evidence", "")
            extracted_from = ttp_data.get("extracted_from", "original")
            
            if not mitre_id:
                continue
            
            # Determine framework
            framework = "ATLAS" if mitre_id.startswith("AML.") else "ATT&CK"
            
            # Extract tactic from MITRE ID (T1566 -> T1566, T1566.001 -> T1566)
            tactic = mitre_id.split(".")[0] if "." in mitre_id else mitre_id
            
            # Check if TTP exists
            existing_ttp = self.db.query(TTP).filter(
                TTP.mitre_id == mitre_id
            ).first()
            
            if existing_ttp:
                # Update existing TTP
                existing_ttp.last_seen_at = datetime.utcnow()
                existing_ttp.occurrence_count += 1
                if confidence > existing_ttp.confidence:
                    existing_ttp.confidence = confidence
                ttp_id = existing_ttp.id
            else:
                # Create new TTP
                new_ttp = TTP(
                    mitre_id=mitre_id,
                    name=name,
                    framework=framework,
                    tactic=tactic,
                    first_seen_at=datetime.utcnow(),
                    last_seen_at=datetime.utcnow(),
                    occurrence_count=1,
                    is_active=True
                )
                self.db.add(new_ttp)
                self.db.flush()
                ttp_id = new_ttp.id
            
            # Create article-TTP mapping (if not exists)
            existing_mapping = self.db.query(ArticleTTPMap).filter(
                ArticleTTPMap.article_id == article_id,
                ArticleTTPMap.ttp_id == ttp_id
            ).first()
            
            if not existing_mapping:
                mapping = ArticleTTPMap(
                    article_id=article_id,
                    ttp_id=ttp_id,
                    extraction_run_id=extraction_run_id,
                    confidence=confidence,
                    evidence=evidence,
                    extracted_from=extracted_from,
                    extracted_by="genai",
                    extracted_at=datetime.utcnow()
                )
                self.db.add(mapping)
                
                # Create timeline event
                event = EntityEvent(
                    entity_type="ttp",
                    entity_id=ttp_id,
                    event_type="article_mention",
                    event_date=datetime.utcnow(),
                    article_id=article_id,
                    extraction_run_id=extraction_run_id,
                    confidence=confidence,
                    context=f"TTP {mitre_id} extracted from {extracted_from}",
                    created_at=datetime.utcnow()
                )
                self.db.add(event)
            
            canonical_ids.append(ttp_id)
            confidences.append(confidence)
            
            # Count exploitation TTPs (Initial Access, Execution, Privilege Escalation)
            if tactic in ["T1190", "T1203", "T1068", "T1055"]:
                exploitation_count += 1
        
        self.db.commit()
        
        logger.info("ttps_canonicalized",
                   article_id=article_id,
                   count=len(canonical_ids),
                   exploitation=exploitation_count)
        
        return {
            "count": len(canonical_ids),
            "ids": canonical_ids,
            "confidences": confidences,
            "exploitation_count": exploitation_count
        }
    
    async def canonicalize_actors(
        self,
        article_id: int,
        actors: List[Dict],
        extraction_run_id: int
    ) -> Dict:
        """
        Canonicalize threat actors - handle aliases and merging.
        
        For each actor:
        1. Check if exists (canonical name or alias)
        2. If exists: update last_seen, increment count
        3. If new: create new actor record
        4. Create article-actor mapping
        5. Create timeline event
        """
        canonical_ids = []
        confidences = []
        
        for actor_data in actors:
            canonical_name = actor_data.get("canonical_name", "")
            actor_type = actor_data.get("type", "threat_actor")
            confidence = actor_data.get("confidence", 50)
            evidence = actor_data.get("evidence", "")
            
            if not canonical_name:
                continue
            
            # Normalize name
            canonical_name = canonical_name.strip()
            
            # Check if actor exists (by name or alias)
            existing_actor = self.db.query(ThreatActor).filter(
                or_(
                    ThreatActor.canonical_name == canonical_name,
                    ThreatActor.aliases.contains([canonical_name])
                )
            ).first()
            
            if existing_actor:
                # Update existing actor
                existing_actor.last_seen_at = datetime.utcnow()
                existing_actor.occurrence_count += 1
                if confidence > existing_actor.confidence:
                    existing_actor.confidence = confidence
                actor_id = existing_actor.id
            else:
                # Create new actor
                new_actor = ThreatActor(
                    canonical_name=canonical_name,
                    aliases=[],
                    actor_type=actor_type,
                    first_seen_at=datetime.utcnow(),
                    last_seen_at=datetime.utcnow(),
                    occurrence_count=1,
                    confidence=confidence,
                    is_active=True
                )
                self.db.add(new_actor)
                self.db.flush()
                actor_id = new_actor.id
            
            # Create article-actor mapping (if not exists)
            existing_mapping = self.db.query(ArticleActorMap).filter(
                ArticleActorMap.article_id == article_id,
                ArticleActorMap.actor_id == actor_id
            ).first()
            
            if not existing_mapping:
                mapping = ArticleActorMap(
                    article_id=article_id,
                    actor_id=actor_id,
                    extraction_run_id=extraction_run_id,
                    confidence=confidence,
                    evidence=evidence,
                    extracted_from="original",
                    extracted_by="genai",
                    extracted_at=datetime.utcnow()
                )
                self.db.add(mapping)
                
                # Create timeline event
                event = EntityEvent(
                    entity_type="actor",
                    entity_id=actor_id,
                    event_type="article_mention",
                    event_date=datetime.utcnow(),
                    article_id=article_id,
                    extraction_run_id=extraction_run_id,
                    confidence=confidence,
                    context=f"Actor {canonical_name} mentioned in article",
                    created_at=datetime.utcnow()
                )
                self.db.add(event)
            
            canonical_ids.append(actor_id)
            confidences.append(confidence)
        
        self.db.commit()
        
        logger.info("actors_canonicalized",
                   article_id=article_id,
                   count=len(canonical_ids))
        
        return {
            "count": len(canonical_ids),
            "ids": canonical_ids,
            "confidences": confidences
        }
    
    def get_entity_timeline(
        self,
        entity_type: str,
        entity_id: int,
        limit: int = 100
    ) -> List[Dict]:
        """
        Get timeline of events for an entity.
        
        Returns chronological list of article mentions and hunt detections.
        """
        events = self.db.query(EntityEvent).filter(
            EntityEvent.entity_type == entity_type,
            EntityEvent.entity_id == entity_id
        ).order_by(EntityEvent.event_date.desc()).limit(limit).all()
        
        return [
            {
                "event_type": e.event_type,
                "event_date": e.event_date,
                "article_id": e.article_id,
                "hunt_id": e.hunt_id,
                "confidence": e.confidence,
                "context": e.context
            }
            for e in events
        ]
    
    def get_entity_statistics(self, entity_type: str, entity_id: int) -> Dict:
        """Get statistics for an entity."""
        if entity_type == "ioc":
            entity = self.db.query(IOC).filter(IOC.id == entity_id).first()
            if not entity:
                return {}
            
            # Get article count
            article_count = self.db.query(ArticleIOC).filter(
                ArticleIOC.ioc_id == entity_id
            ).count()
            
            return {
                "value": entity.value,
                "type": entity.ioc_type,
                "first_seen": entity.first_seen_at,
                "last_seen": entity.last_seen_at,
                "occurrence_count": entity.occurrence_count,
                "article_count": article_count,
                "confidence": entity.confidence,
                "is_false_positive": entity.is_false_positive
            }
        
        elif entity_type == "ttp":
            entity = self.db.query(TTP).filter(TTP.id == entity_id).first()
            if not entity:
                return {}
            
            article_count = self.db.query(ArticleTTPMap).filter(
                ArticleTTPMap.ttp_id == entity_id
            ).count()
            
            return {
                "mitre_id": entity.mitre_id,
                "name": entity.name,
                "framework": entity.framework,
                "tactic": entity.tactic,
                "first_seen": entity.first_seen_at,
                "last_seen": entity.last_seen_at,
                "occurrence_count": entity.occurrence_count,
                "article_count": article_count,
                "severity": entity.severity
            }
        
        elif entity_type == "actor":
            entity = self.db.query(ThreatActor).filter(ThreatActor.id == entity_id).first()
            if not entity:
                return {}
            
            article_count = self.db.query(ArticleActorMap).filter(
                ArticleActorMap.actor_id == entity_id
            ).count()
            
            return {
                "canonical_name": entity.canonical_name,
                "aliases": entity.aliases,
                "actor_type": entity.actor_type,
                "attribution": entity.attribution,
                "first_seen": entity.first_seen_at,
                "last_seen": entity.last_seen_at,
                "occurrence_count": entity.occurrence_count,
                "article_count": article_count,
                "confidence": entity.confidence,
                "is_active": entity.is_active
            }
        
        return {}
    
    def merge_threat_actors(
        self,
        primary_actor_id: int,
        duplicate_actor_ids: List[int],
        user_id: Optional[int] = None
    ) -> Dict:
        """
        Merge duplicate threat actors into primary actor.
        
        Updates:
        - Moves all article mappings to primary
        - Adds duplicate names to aliases
        - Updates occurrence counts
        - Deletes duplicates
        """
        primary = self.db.query(ThreatActor).filter(
            ThreatActor.id == primary_actor_id
        ).first()
        
        if not primary:
            raise ValueError(f"Primary actor {primary_actor_id} not found")
        
        merged_count = 0
        aliases_added = []
        
        for dup_id in duplicate_actor_ids:
            duplicate = self.db.query(ThreatActor).filter(
                ThreatActor.id == dup_id
            ).first()
            
            if not duplicate:
                continue
            
            # Add duplicate name to aliases if not already there
            if duplicate.canonical_name not in (primary.aliases or []):
                primary.aliases = (primary.aliases or []) + [duplicate.canonical_name]
                aliases_added.append(duplicate.canonical_name)
            
            # Move all article mappings
            mappings = self.db.query(ArticleActorMap).filter(
                ArticleActorMap.actor_id == dup_id
            ).all()
            
            for mapping in mappings:
                # Check if mapping already exists for primary
                existing = self.db.query(ArticleActorMap).filter(
                    ArticleActorMap.article_id == mapping.article_id,
                    ArticleActorMap.actor_id == primary_actor_id
                ).first()
                
                if not existing:
                    mapping.actor_id = primary_actor_id
                else:
                    # Delete duplicate mapping
                    self.db.delete(mapping)
            
            # Update occurrence count
            primary.occurrence_count += duplicate.occurrence_count
            
            # Update first/last seen
            if duplicate.first_seen_at < primary.first_seen_at:
                primary.first_seen_at = duplicate.first_seen_at
            if duplicate.last_seen_at > primary.last_seen_at:
                primary.last_seen_at = duplicate.last_seen_at
            
            # Delete duplicate
            self.db.delete(duplicate)
            merged_count += 1
        
        primary.updated_at = datetime.utcnow()
        self.db.commit()
        
        logger.info("threat_actors_merged",
                   primary_id=primary_actor_id,
                   merged_count=merged_count,
                   aliases_added=aliases_added)
        
        return {
            "primary_actor_id": primary_actor_id,
            "merged_count": merged_count,
            "aliases_added": aliases_added,
            "total_occurrences": primary.occurrence_count
        }
