import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import AuditLog, AuditEventType
from app.core.logging import logger


class AuditManager:
    """Manages audit log creation with correlation IDs."""
    
    @staticmethod
    def log_event(
        db: Session,
        event_type: AuditEventType,
        action: str,
        user_id: int = None,
        resource_type: str = None,
        resource_id: int = None,
        details: dict = None,
        correlation_id: str = None,
        ip_address: str = None
    ) -> AuditLog:
        """Create an immutable audit log entry."""
        if correlation_id is None:
            correlation_id = str(uuid.uuid4())
        
        if details is None:
            details = {}
        
        audit_entry = AuditLog(
            user_id=user_id,
            event_type=event_type,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            details=details,
            correlation_id=correlation_id,
            ip_address=ip_address,
            created_at=datetime.utcnow()
        )
        
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        
        logger.info(
            "audit_event_logged",
            event_type=event_type.value,
            action=action,
            user_id=user_id,
            correlation_id=correlation_id,
            resource_type=resource_type,
            resource_id=resource_id
        )
        
        return audit_entry
    
    @staticmethod
    def log_login(
        db: Session,
        user_id: int,
        ip_address: str = None,
        correlation_id: str = None,
        saml: bool = False
    ) -> AuditLog:
        """Log a user login event."""
        return AuditManager.log_event(
            db=db,
            event_type=AuditEventType.LOGIN,
            action="login_success",
            user_id=user_id,
            details={"saml": saml},
            correlation_id=correlation_id,
            ip_address=ip_address
        )
    
    @staticmethod
    def log_article_status_change(
        db: Session,
        article_id: int,
        old_status: str,
        new_status: str,
        user_id: int,
        ip_address: str = None
    ) -> AuditLog:
        """Log article status changes."""
        return AuditManager.log_event(
            db=db,
            event_type=AuditEventType.ARTICLE_LIFECYCLE,
            action="status_changed",
            user_id=user_id,
            resource_type="article",
            resource_id=article_id,
            details={"old_status": old_status, "new_status": new_status},
            ip_address=ip_address
        )
    
    @staticmethod
    def log_intelligence_extracted(
        db: Session,
        article_id: int,
        intelligence_type: str,
        model_name: str,
        prompt_version: str,
        user_id: int,
        ip_address: str = None
    ) -> AuditLog:
        """Log intelligence extraction event."""
        return AuditManager.log_event(
            db=db,
            event_type=AuditEventType.EXTRACTION,
            action="intelligence_extracted",
            user_id=user_id,
            resource_type="article",
            resource_id=article_id,
            details={
                "intelligence_type": intelligence_type,
                "model_name": model_name,
                "prompt_version": prompt_version
            },
            ip_address=ip_address
        )
    
    @staticmethod
    def log_hunt_triggered(
        db: Session,
        hunt_id: int,
        article_id: int,
        trigger_type: str,
        platform: str,
        user_id: int = None,
        ip_address: str = None
    ) -> AuditLog:
        """Log hunt execution trigger."""
        return AuditManager.log_event(
            db=db,
            event_type=AuditEventType.HUNT_TRIGGER,
            action="hunt_triggered",
            user_id=user_id,
            resource_type="hunt",
            resource_id=hunt_id,
            details={
                "article_id": article_id,
                "trigger_type": trigger_type,
                "platform": platform
            },
            ip_address=ip_address
        )
