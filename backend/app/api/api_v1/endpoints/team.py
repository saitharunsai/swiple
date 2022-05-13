import uuid
from typing import Optional

from fastapi import APIRouter, status
from fastapi.params import Depends
from fastapi.responses import JSONResponse

from app import utils
from app.core.users import current_active_user
from app.db.client import client
from app.config.settings import settings
from fastapi import HTTPException, status

from app.models.team import Team, ResponseTeam
from app.models.users import UserDB

router = APIRouter(
    dependencies=[Depends(current_active_user)]
)


@router.get("")
def list_teams(
        asc: Optional[bool] = True,
):
    direction = "asc" if asc else "desc"
    docs = client.search(
        index=settings.TEAM_INDEX,
        body={
            "query": {
                "match_all": {}
            },
            "sort": [
                {"team_name": direction}
            ]
        },
        size=1000,
    )["hits"]["hits"]

    docs_response = []
    for doc in docs:
        print(doc)
        docs_response.append(
            dict(**{"key": doc["_id"]}, **doc["_source"])
        )
    return JSONResponse(status_code=status.HTTP_200_OK, content=docs_response)


@router.post("")
def create_team(
        team: Team,
        user: UserDB = Depends(current_active_user),
):
    _check_team_does_not_exist(team)

    team.created_by = user.email
    team.create_date = utils.current_time()
    team.modified_date = utils.current_time()

    team_as_dict = team.dict(by_alias=True)

    insert_team = client.index(
        index=settings.TEAM_INDEX,
        id=str(uuid.uuid4()),
        body=team_as_dict,
        refresh="wait_for",
    )

    team_as_dict["key"] = insert_team["_id"]

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=team_as_dict
    )


@router.put("/{key}")
def update_team(
        team: Team,
        key: str,
):
    original_team: Team = Team(**client.get(
        index=settings.TEAM_INDEX,
        id=key
    )["_source"])

    if original_team == team:
        return ResponseTeam(key=key, **team.dict(by_alias=True))

    if original_team.team_name != team.team_name:
        _check_team_does_not_exist(team)

    team.modified_date = utils.current_time()
    team.create_date = original_team.create_date
    team.created_by = original_team.created_by

    response = client.update(
        index=settings.DATASET_INDEX,
        id=key,
        body={"doc": team.dict(by_alias=True)},
        refresh="wait_for",
    )
    return ResponseTeam(key=response["_id"], **team.dict(by_alias=True))


@router.delete("/{key}")
def delete_team(
        key: str
):
    try:
        client.delete(
            index=settings.TEAM_INDEX,
            id=key,
            refresh="wait_for"
        )
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"team with id '{key}' does not exist"
        )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content="team deleted"
    )


@router.get("/{key}")
def get_team(
        key: str,
):
    doc = _get_team(key)
    return JSONResponse(status_code=status.HTTP_200_OK, content=doc)


class NotFoundError:
    pass


def _get_team(key: str):
    try:
        response = client.get(
            index=settings.DATASOURCE_INDEX,
            id=key
        )
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"team with id '{key}' does not exist"
        )
    response["_source"]["key"] = response["_id"]


def _check_team_does_not_exist(team: Team):
    query = {
        "query": {
            "bool": {
                "must": {
                    "match": {
                        "team": team.team_name
                    }
                }
            }
        }
    }

    response = client.search(
        index=settings.DATASET_INDEX,
        body=query
    )

    if response["hits"]["total"]["value"] > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Team '{team.team_name}' already exists"
        )
