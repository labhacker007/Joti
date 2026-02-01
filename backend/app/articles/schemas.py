"""API schemas for articles and intelligence."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class ExtractedIntelligenceResponse(BaseModel):
    id: int
    intelligence_type: str  # IOC, IOA, TTP, ATLAS
    value: str
    confidence: int
    evidence: Optional[str] = None
    mitre_id: Optional[str] = None
    mitre_name: Optional[str] = None
    mitre_url: Optional[str] = None
    mitre_framework: Optional[str] = None  # 'attack' or 'atlas'
    source: Optional[str] = None  # Where this was extracted from
    ioc_type: Optional[str] = None  # For IOCs: ip, domain, hash, url, email, etc.
    created_at: Optional[datetime] = None
    hunt_execution_id: Optional[int] = None
    # Hunt info
    hunt_done: bool = False
    hunt_initiated_by: Optional[str] = None  # "AUTO" or username
    hunt_done_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class HuntStatusResponse(BaseModel):
    """Hunt status summary for an article."""
    hunt_id: int
    platform: str
    status: str
    hits_count: int
    findings_summary: Optional[str] = None
    executed_at: Optional[datetime] = None
    execution_time_ms: Optional[int] = None
    email_sent: bool
    servicenow_ticket_id: Optional[str] = None
    
    class Config:
        from_attributes = True


class ArticleResponse(BaseModel):
    id: int
    external_id: str
    title: str
    raw_content: Optional[str] = None
    normalized_content: Optional[str] = None
    summary: Optional[str] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    published_at: Optional[datetime] = None
    status: str
    source_id: Optional[int] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    assigned_analyst_id: Optional[int] = None
    genai_analysis_remarks: Optional[str] = None  # Renamed from analyst_remarks
    executive_summary: Optional[str] = None
    technical_summary: Optional[str] = None
    reviewed_by_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    analyzed_by_id: Optional[int] = None
    analyzed_at: Optional[datetime] = None
    is_high_priority: bool
    watchlist_match_keywords: List[str] = []
    intelligence_count: int = 0  # Total extracted intelligence count
    created_at: datetime
    updated_at: datetime
    extracted_intelligence: List[ExtractedIntelligenceResponse] = []
    hunt_status: List[HuntStatusResponse] = []  # Hunt execution status
    is_read: Optional[bool] = None  # Per-user read status
    
    class Config:
        from_attributes = True


class ArticleStatusUpdate(BaseModel):
    status: str
    genai_analysis_remarks: Optional[str] = None  # Renamed from analyst_remarks


class ArticleAssignRequest(BaseModel):
    analyst_id: Optional[int] = None  # None to unassign


class ArticleAssignmentResponse(BaseModel):
    article_id: int
    assigned_analyst_id: Optional[int]
    assigned_analyst_name: Optional[str]
    assigned_at: Optional[datetime]
    message: str


class ArticleAnalysisUpdate(BaseModel):
    executive_summary: Optional[str] = None
    technical_summary: Optional[str] = None


class TriageArticlesResponse(BaseModel):
    articles: List[ArticleResponse]
    total: int
    page: int
    page_size: int


class CommentCreate(BaseModel):
    comment_text: str
    is_internal: bool = True
    parent_id: Optional[int] = None


class CommentUpdate(BaseModel):
    comment_text: str


class CommentResponse(BaseModel):
    id: int
    article_id: int
    user_id: int
    username: Optional[str] = None
    comment_text: str
    is_internal: bool
    parent_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ArticleCommentsResponse(BaseModel):
    comments: List[CommentResponse]
    total: int
