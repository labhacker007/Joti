"""
Threat Actor Profile API Routes
Provides CRUD, GenAI enrichment, and alias resolution for threat actor profiles.
"""
from datetime import datetime, timedelta
from typing import Optional, List
import structlog

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.auth.rbac import Permission
from app.models import User, ThreatActorProfile, ExtractedIntelligence, ExtractedIntelligenceType

VIEW_INTELLIGENCE = Permission.ARTICLES_READ.value
MANAGE_INTELLIGENCE = Permission.ARTICLES_ANALYZE.value

logger = structlog.get_logger()

router = APIRouter(prefix="/threat-actors", tags=["Threat Actors"])

# ─── Known alias sets (primary name → all known aliases) ───────────────────

KNOWN_ALIASES: dict[str, list[str]] = {
    "Scattered Spider": ["UNC3944", "Roasted 0ktapus", "Muddled Libra", "Starfraud", "Oktapus"],
    "APT28": ["Fancy Bear", "Sofacy", "Strontium", "Pawn Storm", "Sednit", "Tsar Team", "Forest Blizzard"],
    "APT29": ["Cozy Bear", "The Dukes", "Office Monkeys", "Midnight Blizzard", "Nobelium", "Dark Halo"],
    "Lazarus Group": ["Hidden Cobra", "Guardians of Peace", "APT38", "Whois Team", "Zinc"],
    "APT41": ["Double Dragon", "Barium", "Winnti", "Bronze Atlas", "Wicked Panda", "Earth Baku"],
    "FIN7": ["Carbanak", "Navigator Group", "ITG14", "Carbon Spider"],
    "Conti": ["Wizard Spider", "Gold Ulrick", "ITG23"],
    "LockBit": ["Gold Mystic", "Syrphid"],
    "BlackCat": ["ALPHV", "Noberus"],
    "REvil": ["Sodinokibi", "Gold Southfield"],
    "DarkSide": ["Carbon Spider"],
    "Sandworm": ["Voodoo Bear", "Telebots", "Iron Viking", "Seashell Blizzard", "Electrum"],
    "Turla": ["Snake", "Uroburos", "Waterbug", "Venomous Bear", "Krypton"],
    "Equation Group": ["IRATEMONK", "Tilded Platform"],
    "Kimsuky": ["Thallium", "Velvet Chollima", "Black Banshee", "TA406"],
    "Volt Typhoon": ["Bronze Silhouette", "DEV-0391", "Vanguard Panda"],
    "Salt Typhoon": ["GhostEmperor", "FamousSparrow"],
    "LAPSUS$": ["DEV-0537", "Strawberry Tempest"],
    "TA505": ["Hive0065", "Evil Corp subset"],
    "Cl0p": ["TA505 subset", "Gold Tahoe"],
}


def resolve_aliases(name: str) -> list[str]:
    """Return known aliases for a threat actor name."""
    name_lower = name.lower()
    for primary, aliases in KNOWN_ALIASES.items():
        all_names = [primary] + aliases
        if any(n.lower() == name_lower for n in all_names):
            return [n for n in all_names if n.lower() != name_lower]
    return []


def get_primary_name(name: str) -> str:
    """Return the primary/canonical name for a threat actor."""
    name_lower = name.lower()
    for primary, aliases in KNOWN_ALIASES.items():
        all_names = [primary] + aliases
        if any(n.lower() == name_lower for n in all_names):
            return primary
    return name


# ─── Helper ────────────────────────────────────────────────────────────────

def profile_to_dict(p: ThreatActorProfile) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "origin_country": p.origin_country,
        "motivation": p.motivation,
        "actor_type": p.actor_type,
        "first_seen": p.first_seen.isoformat() if p.first_seen else None,
        "last_seen": p.last_seen.isoformat() if p.last_seen else None,
        "is_active": p.is_active,
        "target_sectors": p.target_sectors or [],
        "aliases": p.aliases or [],
        "ttps": p.ttps or [],
        "infrastructure": p.infrastructure or [],
        "tools": p.tools or [],
        "campaigns": p.campaigns or [],
        "ioc_count": p.ioc_count or 0,
        "article_count": p.article_count or 0,
        "ttp_count": p.ttp_count or 0,
        "last_enriched_at": p.last_enriched_at.isoformat() if p.last_enriched_at else None,
        "enrichment_source": p.enrichment_source,
        "genai_confidence": p.genai_confidence or 0,
        "is_verified": p.is_verified,
        "tags": p.tags or [],
        "external_refs": p.external_refs or [],
        "meta": p.meta or {},
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


# ─── Routes ────────────────────────────────────────────────────────────────

@router.get("/")
async def list_threat_actors(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    actor_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(VIEW_INTELLIGENCE)),
):
    """List all threat actor profiles."""
    q = db.query(ThreatActorProfile)

    if search:
        q = q.filter(
            or_(
                ThreatActorProfile.name.ilike(f"%{search}%"),
                ThreatActorProfile.description.ilike(f"%{search}%"),
            )
        )
    if actor_type:
        q = q.filter(ThreatActorProfile.actor_type == actor_type)
    if is_active is not None:
        q = q.filter(ThreatActorProfile.is_active == is_active)

    total = q.count()
    profiles = q.order_by(ThreatActorProfile.article_count.desc(), ThreatActorProfile.name)\
        .offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [profile_to_dict(p) for p in profiles],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/sync")
async def sync_threat_actors(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(MANAGE_INTELLIGENCE)),
):
    """
    Sync threat actor profiles from ExtractedIntelligence.
    Groups all THREAT_ACTOR intel items by name, resolves aliases,
    and creates/updates ThreatActorProfile records.
    """
    try:
        count = _sync_profiles_from_intel(db)
        return {"success": True, "synced": count, "message": f"Synced {count} threat actor profiles"}
    except Exception as e:
        logger.error("ta_sync_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


def _sync_profiles_from_intel(db: Session) -> int:
    """
    Create/update ThreatActorProfile records from ExtractedIntelligence.
    Groups intel by canonical actor name (after alias resolution).
    Returns count of profiles created or updated.
    """
    intel_items = db.query(ExtractedIntelligence).filter(
        ExtractedIntelligence.intelligence_type == ExtractedIntelligenceType.THREAT_ACTOR,
        ExtractedIntelligence.is_false_positive == False,
    ).all()

    # Group by primary name
    actor_data: dict[str, dict] = {}
    for item in intel_items:
        primary = get_primary_name(item.value)
        if primary not in actor_data:
            actor_data[primary] = {
                "aliases": set(resolve_aliases(primary)),
                "article_ids": set(),
                "ioc_items": [],
                "ttp_items": [],
                "confidence_sum": 0,
                "mention_count": 0,
                "first_seen": None,
                "last_seen": None,
            }
        d = actor_data[primary]
        d["mention_count"] += 1
        d["confidence_sum"] += item.confidence or 50
        if item.article_id:
            d["article_ids"].add(item.article_id)
        created = item.created_at or datetime.utcnow()
        if d["first_seen"] is None or created < d["first_seen"]:
            d["first_seen"] = created
        if d["last_seen"] is None or created > d["last_seen"]:
            d["last_seen"] = created
        # Track alternate names from metadata
        alt = item.meta.get("alternate_names", []) if item.meta else []
        for a in alt:
            d["aliases"].add(a)

    synced = 0
    for primary_name, data in actor_data.items():
        existing = db.query(ThreatActorProfile).filter(
            ThreatActorProfile.name == primary_name
        ).first()

        if existing:
            # Update stats
            existing.article_count = len(data["article_ids"])
            existing.last_seen = data["last_seen"]
            # Merge aliases
            existing_aliases = set(existing.aliases or [])
            existing.aliases = list(existing_aliases | data["aliases"])
            existing.updated_at = datetime.utcnow()
        else:
            profile = ThreatActorProfile(
                name=primary_name,
                aliases=list(data["aliases"]),
                article_count=len(data["article_ids"]),
                ioc_count=0,
                ttp_count=0,
                first_seen=data["first_seen"],
                last_seen=data["last_seen"],
                enrichment_source="sync",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(profile)
        synced += 1

    db.commit()
    return synced


@router.post("/enrich/{profile_id}")
async def enrich_threat_actor(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(MANAGE_INTELLIGENCE)),
):
    """
    Enrich a threat actor profile using GenAI.
    Looks up known aliases, origin, motivation, TTPs, and target sectors.
    """
    profile = db.query(ThreatActorProfile).filter(ThreatActorProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Threat actor profile not found")

    try:
        enrichment = await _enrich_with_genai(profile.name, db)
        if enrichment:
            if enrichment.get("aliases"):
                existing = set(profile.aliases or [])
                profile.aliases = list(existing | set(enrichment["aliases"]))
            if enrichment.get("description") and not profile.description:
                profile.description = enrichment["description"]
            if enrichment.get("origin_country") and not profile.origin_country:
                profile.origin_country = enrichment["origin_country"]
            if enrichment.get("motivation") and not profile.motivation:
                profile.motivation = enrichment["motivation"]
            if enrichment.get("actor_type") and not profile.actor_type:
                profile.actor_type = enrichment["actor_type"]
            if enrichment.get("target_sectors"):
                profile.target_sectors = enrichment["target_sectors"]
            if enrichment.get("ttps"):
                existing_ttps = set(profile.ttps or [])
                profile.ttps = list(existing_ttps | set(enrichment["ttps"]))
                profile.ttp_count = len(profile.ttps)
            if enrichment.get("tools"):
                profile.tools = enrichment["tools"]
            profile.last_enriched_at = datetime.utcnow()
            profile.enrichment_source = "genai"
            profile.genai_confidence = enrichment.get("confidence", 70)
            profile.updated_at = datetime.utcnow()
            db.commit()

        return {"success": True, "profile": profile_to_dict(profile)}
    except Exception as e:
        logger.error("ta_enrich_failed", profile_id=profile_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {str(e)}")


async def _enrich_with_genai(actor_name: str, db: Session) -> Optional[dict]:
    """Use GenAI to enrich a threat actor profile."""
    try:
        from app.genai.unified_service import get_unified_service
        service = get_unified_service(db)

        prompt = f"""You are a threat intelligence analyst. Provide structured intelligence about the threat actor: "{actor_name}"

Return a JSON object with these fields (omit fields you don't know with confidence):
{{
  "aliases": ["list", "of", "known", "aliases"],
  "description": "Brief description of the group",
  "origin_country": "Country of origin or null",
  "motivation": "financial|espionage|hacktivism|destructive|unknown",
  "actor_type": "APT|ransomware|cybercriminal|hacktivist|nation-state|unknown",
  "target_sectors": ["government", "finance", "healthcare", etc],
  "ttps": ["T1566.001", "T1078", ...],
  "tools": ["known malware/tools"],
  "confidence": 0-100
}}

Only include information you are confident about. Do not fabricate details."""

        response = await service.generate(
            user_prompt=prompt,
            system_prompt="You are a threat intelligence analyst. Return only valid JSON.",
            use_case="extraction",
        )

        import json, re
        text = response.get("content", "") or response.get("text", "")
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        logger.warning("ta_genai_enrich_failed", actor=actor_name, error=str(e))
    return None


@router.get("/{profile_id}")
async def get_threat_actor(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(VIEW_INTELLIGENCE)),
):
    """Get a single threat actor profile."""
    profile = db.query(ThreatActorProfile).filter(ThreatActorProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Threat actor profile not found")
    return profile_to_dict(profile)


@router.patch("/{profile_id}")
async def update_threat_actor(
    profile_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(MANAGE_INTELLIGENCE)),
):
    """Update a threat actor profile."""
    profile = db.query(ThreatActorProfile).filter(ThreatActorProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Threat actor profile not found")

    allowed = {"description", "origin_country", "motivation", "actor_type", "target_sectors",
               "aliases", "ttps", "infrastructure", "tools", "campaigns", "is_active",
               "is_verified", "tags", "external_refs"}
    for k, v in data.items():
        if k in allowed:
            setattr(profile, k, v)
    profile.updated_at = datetime.utcnow()
    db.commit()
    return profile_to_dict(profile)


@router.delete("/{profile_id}")
async def delete_threat_actor(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(MANAGE_INTELLIGENCE)),
):
    """Delete a threat actor profile."""
    profile = db.query(ThreatActorProfile).filter(ThreatActorProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Threat actor profile not found")
    db.delete(profile)
    db.commit()
    return {"success": True}


@router.get("/{profile_id}/intelligence")
async def get_actor_intelligence(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(VIEW_INTELLIGENCE)),
):
    """Get all intelligence items associated with a threat actor (by name + aliases)."""
    profile = db.query(ThreatActorProfile).filter(ThreatActorProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Threat actor profile not found")

    all_names = [profile.name] + (profile.aliases or [])
    intel_items = db.query(ExtractedIntelligence).filter(
        ExtractedIntelligence.intelligence_type == ExtractedIntelligenceType.THREAT_ACTOR,
        or_(*[ExtractedIntelligence.value.ilike(name) for name in all_names]),
    ).order_by(ExtractedIntelligence.created_at.desc()).limit(100).all()

    return {
        "actor": profile_to_dict(profile),
        "intel_count": len(intel_items),
        "items": [
            {
                "id": i.id,
                "value": i.value,
                "confidence": i.confidence,
                "evidence": i.evidence,
                "article_id": i.article_id,
                "article_title": i.article.title if i.article else None,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in intel_items
        ],
    }
