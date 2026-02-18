"""Skills CRUD API for GenAI prompt skills management — database-backed."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.logging import logger
from app.auth.dependencies import require_permission
from app.auth.rbac import Permission
from app.models import User, Skill

router = APIRouter(prefix="/admin/genai-skills", tags=["admin-skills"])


class SkillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: str = "domain_expertise"
    instruction: str = Field(..., min_length=1)
    is_active: bool = True


class SkillUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    category: Optional[str] = None
    instruction: Optional[str] = None
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


def _skill_to_response(skill: Skill) -> SkillResponse:
    """Convert DB Skill model to API response format."""
    return SkillResponse(
        id=str(skill.id),
        name=skill.name,
        description=skill.description,
        persona=skill.category or "domain_expertise",
        instructions=skill.instruction,
        is_active=skill.is_active,
        created_at=skill.created_at.isoformat() + "Z" if skill.created_at else "",
        updated_at=skill.created_at.isoformat() + "Z" if skill.created_at else "",
    )


@router.get("/", response_model=List[SkillResponse])
def list_skills(
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_VIEW.value)),
    db: Session = Depends(get_db),
):
    """List all GenAI skills."""
    skills = db.query(Skill).order_by(Skill.name).all()
    return [_skill_to_response(s) for s in skills]


@router.get("/{skill_id}", response_model=SkillResponse)
def get_skill(
    skill_id: int,
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_VIEW.value)),
    db: Session = Depends(get_db),
):
    """Get a specific skill by ID."""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return _skill_to_response(skill)


@router.post("/", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def create_skill(
    payload: SkillCreate,
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_EDIT.value)),
    db: Session = Depends(get_db),
):
    """Create a new GenAI skill."""
    skill = Skill(
        name=payload.name,
        description=payload.description,
        category=payload.category,
        instruction=payload.instruction,
        is_active=payload.is_active,
        created_by_id=current_user.id,
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    logger.info("skill_created", skill_id=skill.id, name=skill.name, user_id=current_user.id)
    return _skill_to_response(skill)


@router.patch("/{skill_id}", response_model=SkillResponse)
def update_skill(
    skill_id: int,
    payload: SkillUpdate,
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_EDIT.value)),
    db: Session = Depends(get_db),
):
    """Update an existing GenAI skill."""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(skill, key, value)

    db.commit()
    db.refresh(skill)
    logger.info("skill_updated", skill_id=skill_id, user_id=current_user.id)
    return _skill_to_response(skill)


@router.delete("/{skill_id}")
def delete_skill(
    skill_id: int,
    current_user: User = Depends(require_permission(Permission.ADMIN_GENAI_EDIT.value)),
    db: Session = Depends(get_db),
):
    """Delete a GenAI skill."""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    name = skill.name
    db.delete(skill)
    db.commit()
    logger.info("skill_deleted", skill_id=skill_id, name=name, user_id=current_user.id)
    return {"message": f"Skill '{name}' deleted"}
