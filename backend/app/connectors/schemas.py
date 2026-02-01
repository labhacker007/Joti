from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class ConnectorBase(BaseModel):
    name: str
    connector_type: str
    config: Optional[Dict[str, Any]] = {}
    is_active: Optional[bool] = True


class ConnectorCreate(ConnectorBase):
    pass


class ConnectorUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ConnectorResponse(ConnectorBase):
    id: int
    last_tested_at: Optional[datetime] = None
    last_test_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
