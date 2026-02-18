"""Skills CRUD API for GenAI prompt skills management."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.logging import logger
from app.auth.dependencies import require_permission
from app.auth.rbac import Permission
from app.models import User

router = APIRouter(prefix="/admin/genai-skills", tags=["admin-skills"])


# In-memory skills store (would be DB-backed in production with a Skills model)
_skills_store: List[dict] = [
    {
        "id": "skill-exec-report",
        "name": "Executive Report Writer",
        "description": "Skill for writing executive-level threat reports with business impact focus.",
        "persona": "executive",
        "instructions": "Focus on business impact, financial exposure, and strategic recommendations. Write in flowing narrative prose.",
        "is_active": True,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    },
    {
        "id": "skill-ioc-analyst",
        "name": "Technical IOC Analyst",
        "description": "Skill for precise IOC identification, validation, and classification.",
        "persona": "analyst",
        "instructions": "Extract all indicator types with confidence scores. Apply defanging. Cross-reference with known threat actor TTPs.",
        "is_active": True,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    },
    {
        "id": "skill-mitre-mapper",
        "name": "MITRE ATT&CK Mapper",
        "description": "Skill for accurate MITRE ATT&CK technique mapping from threat reports.",
        "persona": "technical",
        "instructions": "Map every identified behavior to specific MITRE ATT&CK technique IDs (T####.### format). Include tactic and technique names.",
        "is_active": True,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    },
    {
        "id": "skill-threat-profiler",
        "name": "Threat Actor Profiler",
        "description": "Skill for identifying, attributing, and profiling threat actors from intelligence reports.",
        "persona": "analyst",
        "instructions": "Identify threat actor names, aliases, known campaigns, and attribution indicators. Apply confidence scoring.",
        "is_active": True,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    },
    {
        "id": "skill-detection-engineer",
        "name": "Detection Engineer",
        "description": "Skill for generating detection queries for SIEM/EDR platforms.",
        "persona": "technical",
        "instructions": "Generate detection queries for XQL (XSIAM), KQL (Defender), SPL (Splunk). Reference specific log sources and event IDs.",
        "is_active": True,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    },
]


class SkillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    persona: str = "analyst"
    instructions: str = Field(..., min_length=1)
    is_active: bool = True


class SkillUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    persona: Optional[str] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None


class SkillResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    persona: str
    instructions: str
    is_active: bool
    created_at: str
    updated_at: str


@router.get("/", response_model=List[SkillResponse])
def list_skills(
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_VIEW.value)),
):
    """List all GenAI skills."""
    return _skills_store


@router.get("/{skill_id}", response_model=SkillResponse)
def get_skill(
    skill_id: str,
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_VIEW.value)),
):
    """Get a specific skill by ID."""
    for skill in _skills_store:
        if skill["id"] == skill_id:
            return skill
    raise HTTPException(status_code=404, detail="Skill not found")


@router.post("/", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def create_skill(
    payload: SkillCreate,
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_EDIT.value)),
):
    """Create a new GenAI skill."""
    import uuid
    now = datetime.utcnow().isoformat() + "Z"
    skill = {
        "id": f"skill-{uuid.uuid4().hex[:8]}",
        "name": payload.name,
        "description": payload.description,
        "persona": payload.persona,
        "instructions": payload.instructions,
        "is_active": payload.is_active,
        "created_at": now,
        "updated_at": now,
    }
    _skills_store.append(skill)
    logger.info("skill_created", skill_id=skill["id"], name=skill["name"], user_id=current_user.id)
    return skill


@router.patch("/{skill_id}", response_model=SkillResponse)
def update_skill(
    skill_id: str,
    payload: SkillUpdate,
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_EDIT.value)),
):
    """Update an existing GenAI skill."""
    for skill in _skills_store:
        if skill["id"] == skill_id:
            update_data = payload.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                skill[key] = value
            skill["updated_at"] = datetime.utcnow().isoformat() + "Z"
            logger.info("skill_updated", skill_id=skill_id, user_id=current_user.id)
            return skill
    raise HTTPException(status_code=404, detail="Skill not found")


@router.delete("/{skill_id}")
def delete_skill(
    skill_id: str,
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_EDIT.value)),
):
    """Delete a GenAI skill."""
    for i, skill in enumerate(_skills_store):
        if skill["id"] == skill_id:
            deleted = _skills_store.pop(i)
            logger.info("skill_deleted", skill_id=skill_id, name=deleted["name"], user_id=current_user.id)
            return {"message": f"Skill '{deleted['name']}' deleted"}
    raise HTTPException(status_code=404, detail="Skill not found")
