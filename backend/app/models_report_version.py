"""
Report Version History Model
Tracks changes to reports when they are republished
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON as SQLJSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class ReportVersion(Base):
    """Stores historical versions of reports for version control."""
    __tablename__ = "report_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False, index=True)
    
    # Snapshot of report content at this version
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    executive_summary = Column(Text, nullable=True)
    technical_summary = Column(Text, nullable=True)
    key_findings = Column(SQLJSON, default=[])
    recommendations = Column(SQLJSON, default=[])
    report_type = Column(String, nullable=False)
    status = Column(String, nullable=False)  # DRAFT, PUBLISHED, ARCHIVED
    
    # Version metadata
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    change_notes = Column(Text, nullable=True)  # What changed in this version
    change_summary = Column(String, nullable=True)  # Brief one-line summary
    
    # Relationships
    report = relationship("Report", foreign_keys=[report_id], back_populates="versions")
    created_by = relationship("User")
    
    __table_args__ = (
        {'extend_existing': True}
    )


# Update the Report model to include version relationship
def enhance_report_model(Report):
    """
    Adds version control fields to the Report model.
    Call this after Report is defined in models.py
    """
    if not hasattr(Report, 'versions'):
        Report.versions = relationship("ReportVersion", back_populates="report", cascade="all, delete-orphan", order_by="ReportVersion.version_number")
    
    if not hasattr(Report, 'parent_version_id'):
        Report.parent_version_id = Column(Integer, ForeignKey("report_versions.id"), nullable=True)
        Report.parent_version = relationship("ReportVersion", foreign_keys=[Report.parent_version_id])
    
    if not hasattr(Report, 'allow_edits'):
        Report.allow_edits = Column(Boolean, default=False)  # If True, published reports can be edited
