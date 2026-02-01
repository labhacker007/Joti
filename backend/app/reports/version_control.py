"""
Report Version Control Endpoints
Provides version history and republish capabilities
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models import Report, ReportStatus, User, AuditEventType
from app.audit.manager import AuditManager
from app.core.logging import logger
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/reports", tags=["Report Versions"])


class VersionHistoryResponse(BaseModel):
    """Response for version history."""
    version_number: int
    title: str
    status: str
    created_by_id: Optional[int]
    created_at: datetime
    change_summary: Optional[str]
    change_notes: Optional[str]
    
    class Config:
        from_attributes = True


class RepublishRequest(BaseModel):
    """Request to republish an edited report."""
    change_summary: str
    change_notes: Optional[str] = None


@router.get("/{report_id}/versions", response_model=List[VersionHistoryResponse])
def get_report_versions(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get version history for a report."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    try:
        from app.models_report_version import ReportVersion
        versions = db.query(ReportVersion).filter(
            ReportVersion.report_id == report_id
        ).order_by(ReportVersion.version_number.desc()).all()
        
        return [VersionHistoryResponse.model_validate(v) for v in versions]
    except ImportError:
        logger.warning("ReportVersion model not available, returning empty list")
        return []


@router.post("/{report_id}/republish")
def republish_report(
    report_id: int,
    request: RepublishRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Republish an edited report with version tracking.
    
    This endpoint:
    1. Saves current published version to history
    2. Increments version number
    3. Changes status from DRAFT to PUBLISHED
    4. Records who republished and when
    """
    # Permission check: Only ADMIN and TI can publish
    if current_user.role not in ["ADMIN", "TI"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Intel Analysts and Admins can publish reports"
        )
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Can only republish DRAFT reports
    if report.status != ReportStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only publish reports in DRAFT status"
        )
    
    # If this is a republish (version > 1), save version history
    if report.version > 1:
        try:
            from app.models_report_version import ReportVersion
            
            # Create version snapshot
            version_snapshot = ReportVersion(
                report_id=report.id,
                version_number=report.version,
                title=report.title,
                content=report.content,
                executive_summary=report.executive_summary,
                technical_summary=report.technical_summary,
                key_findings=report.key_findings,
                recommendations=report.recommendations,
                report_type=report.report_type,
                status=ReportStatus.PUBLISHED.value,
                created_by_id=current_user.id,
                created_at=datetime.utcnow(),
                change_summary=request.change_summary,
                change_notes=request.change_notes
            )
            db.add(version_snapshot)
            
            logger.info("report_version_saved", 
                       report_id=report_id, 
                       version=report.version,
                       user_id=current_user.id)
        except ImportError:
            logger.warning("ReportVersion model not available, skipping version history")
    
    # Publish the report
    report.status = ReportStatus.PUBLISHED
    report.published_by_id = current_user.id
    report.published_at = datetime.utcnow()
    
    db.commit()
    db.refresh(report)
    
    logger.info("report_republished", 
               report_id=report_id, 
               version=report.version,
               publisher_id=current_user.id)
    
    # Audit log
    AuditManager.log_event(
        db=db,
        user_id=current_user.id,
        event_type=AuditEventType.REPORT_GENERATION,
        action=f"Republished report (v{report.version}): {report.title}",
        resource_type="report",
        resource_id=report_id,
        details={
            "version": report.version,
            "change_summary": request.change_summary,
            "change_notes": request.change_notes
        }
    )
    
    return {
        "success": True,
        "message": f"Report republished as version {report.version}",
        "report_id": report.id,
        "version": report.version,
        "published_at": report.published_at
    }


@router.post("/{report_id}/edit-published")
def enable_editing_published_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enable editing of a published report.
    
    This creates a version snapshot and changes status to DRAFT for editing.
    User can then edit and republish.
    """
    # Permission check
    if current_user.role not in ["ADMIN", "TI"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Intel Analysts and Admins can edit published reports"
        )
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    if report.status != ReportStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report is not published. Use regular edit endpoint for drafts."
        )
    
    # Save current version to history
    try:
        from app.models_report_version import ReportVersion
        
        version_snapshot = ReportVersion(
            report_id=report.id,
            version_number=report.version,
            title=report.title,
            content=report.content,
            executive_summary=report.executive_summary,
            technical_summary=report.technical_summary,
            key_findings=report.key_findings,
            recommendations=report.recommendations,
            report_type=report.report_type,
            status=ReportStatus.PUBLISHED.value,
            created_by_id=report.published_by_id or report.generated_by_id,
            created_at=report.published_at or report.created_at,
            change_summary=f"Published version {report.version}",
            change_notes="Version saved before enabling edits"
        )
        db.add(version_snapshot)
    except ImportError:
        logger.warning("ReportVersion model not available, proceeding without version history")
    
    # Set report to DRAFT for editing
    report.status = ReportStatus.DRAFT
    db.commit()
    db.refresh(report)
    
    logger.info("report_editing_enabled", report_id=report_id, user_id=current_user.id)
    
    # Audit log
    AuditManager.log_event(
        db=db,
        user_id=current_user.id,
        event_type=AuditEventType.REPORT_GENERATION,
        action=f"Enabled editing for published report: {report.title}",
        resource_type="report",
        resource_id=report_id,
        details={"previous_version": report.version}
    )
    
    return {
        "success": True,
        "message": "Report is now in DRAFT status for editing. Republish when done.",
        "report_id": report.id,
        "current_version": report.version,
        "status": "DRAFT"
    }


@router.get("/{report_id}/version/{version_number}")
def get_specific_version(
    report_id: int,
    version_number: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve a specific version of a report from history."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    try:
        from app.models_report_version import ReportVersion
        
        version = db.query(ReportVersion).filter(
            ReportVersion.report_id == report_id,
            ReportVersion.version_number == version_number
        ).first()
        
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version {version_number} not found"
            )
        
        return {
            "version_number": version.version_number,
            "title": version.title,
            "content": version.content,
            "executive_summary": version.executive_summary,
            "technical_summary": version.technical_summary,
            "key_findings": version.key_findings,
            "recommendations": version.recommendations,
            "report_type": version.report_type,
            "status": version.status,
            "created_at": version.created_at,
            "change_summary": version.change_summary,
            "change_notes": version.change_notes
        }
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Version control not available"
        )


@router.post("/{report_id}/restore/{version_number}")
def restore_version(
    report_id: int,
    version_number: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Restore a report to a previous version.
    Creates a new version with the old content.
    """
    # Permission check
    if current_user.role not in ["ADMIN", "TI"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Intel Analysts and Admins can restore report versions"
        )
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    try:
        from app.models_report_version import ReportVersion
        
        # Get the version to restore
        old_version = db.query(ReportVersion).filter(
            ReportVersion.report_id == report_id,
            ReportVersion.version_number == version_number
        ).first()
        
        if not old_version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version {version_number} not found"
            )
        
        # Save current state as a version if published
        if report.status == ReportStatus.PUBLISHED:
            current_version = ReportVersion(
                report_id=report.id,
                version_number=report.version,
                title=report.title,
                content=report.content,
                executive_summary=report.executive_summary,
                technical_summary=report.technical_summary,
                key_findings=report.key_findings,
                recommendations=report.recommendations,
                report_type=report.report_type,
                status=report.status.value,
                created_by_id=current_user.id,
                created_at=datetime.utcnow(),
                change_summary=f"Version before restore to v{version_number}",
                change_notes="Automatic backup before restore"
            )
            db.add(current_version)
        
        # Restore the old content
        report.title = old_version.title
        report.content = old_version.content
        report.executive_summary = old_version.executive_summary
        report.technical_summary = old_version.technical_summary
        report.key_findings = old_version.key_findings
        report.recommendations = old_version.recommendations
        report.edited_by_id = current_user.id
        report.edited_at = datetime.utcnow()
        report.version += 1
        report.status = ReportStatus.DRAFT  # Set to draft for review
        
        db.commit()
        db.refresh(report)
        
        logger.info("report_version_restored",
                   report_id=report_id,
                   restored_version=version_number,
                   new_version=report.version,
                   user_id=current_user.id)
        
        # Audit log
        AuditManager.log_event(
            db=db,
            user_id=current_user.id,
            event_type=AuditEventType.REPORT_GENERATION,
            action=f"Restored report to version {version_number}",
            resource_type="report",
            resource_id=report_id,
            details={
                "restored_from_version": version_number,
                "new_version": report.version
            }
        )
        
        return {
            "success": True,
            "message": f"Report restored to version {version_number}. Now in DRAFT status as v{report.version}.",
            "report_id": report.id,
            "current_version": report.version,
            "restored_from": version_number
        }
        
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Version control not available"
        )


@router.get("/{report_id}/compare")
def compare_versions(
    report_id: int,
    version1: int,
    version2: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compare two versions of a report.
    Returns a diff-like structure showing changes.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    try:
        from app.models_report_version import ReportVersion
        import difflib
        
        # Get both versions
        v1 = db.query(ReportVersion).filter(
            ReportVersion.report_id == report_id,
            ReportVersion.version_number == version1
        ).first()
        
        v2 = db.query(ReportVersion).filter(
            ReportVersion.report_id == report_id,
            ReportVersion.version_number == version2
        ).first()
        
        if not v1 or not v2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or both versions not found"
            )
        
        # Compare content
        def generate_diff(text1, text2, field_name):
            if text1 == text2:
                return {"changed": False, "diff": None}
            
            lines1 = (text1 or "").splitlines()
            lines2 = (text2 or "").splitlines()
            
            diff = list(difflib.unified_diff(
                lines1, lines2,
                fromfile=f"Version {version1}",
                tofile=f"Version {version2}",
                lineterm=""
            ))
            
            return {
                "changed": True,
                "diff": diff,
                "added_lines": len([l for l in diff if l.startswith('+') and not l.startswith('+++')]),
                "removed_lines": len([l for l in diff if l.startswith('-') and not l.startswith('---')])
            }
        
        return {
            "report_id": report_id,
            "version1": version1,
            "version2": version2,
            "comparison": {
                "title": generate_diff(v1.title, v2.title, "title"),
                "executive_summary": generate_diff(v1.executive_summary, v2.executive_summary, "executive_summary"),
                "technical_summary": generate_diff(v1.technical_summary, v2.technical_summary, "technical_summary"),
                "content": generate_diff(v1.content, v2.content, "content"),
            },
            "metadata": {
                "v1_created": v1.created_at,
                "v2_created": v2.created_at,
                "v1_summary": v1.change_summary,
                "v2_summary": v2.change_summary
            }
        }
        
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Version control not available"
        )
