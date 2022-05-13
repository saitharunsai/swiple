from typing import Optional

from app.models.base_model import BaseModel


class Team(BaseModel):
    team_name: str
    members: list
    created_by: Optional[str]
    create_date: Optional[str]
    modified_date: Optional[str]


class ResponseTeam(Team):
    key: str
