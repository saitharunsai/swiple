from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError

from app.models import actions as act
from app.utils import json_schema_to_single_doc
import uuid
from typing import Optional, Literal

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
from app.models.actions import (
    Action,
)


router = APIRouter(
    # dependencies=[Depends(current_active_user)]
)


@router.get("/json_schema")
def get_json_schema():
    actions = []
    for action in act.type_map.values():
        json_schema = json_schema_to_single_doc(action.schema())
        actions.append(json_schema)

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=actions
    )


@router.get("")
def list_actions(
        asc: Optional[bool] = True,
):
    direction = "asc" if asc else "desc"
    docs = client.search(
        index=settings.ACTION_INDEX,
        body={
            "query": {
                "match_all": {}
            },
            "sort": [
                {"action_name": direction}
            ]
        },
        size=1000,
    )["hits"]["hits"]

    docs_response = []
    for doc in docs:
        docs_response.append(
            dict(**{"key": doc["_id"]}, **doc["_source"])
        )
    print(docs_response)
    return JSONResponse(status_code=status.HTTP_200_OK, content=docs_response)


@router.post("")
def create_action(
        action: Action,
):
    try:
        action.create_date = utils.current_time()
        action.modified_date = utils.current_time()
        action_as_dict: dict = act.type_map[action.action_type](**action.dict(exclude_none=True)).dict(exclude_none=True)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Action '{action.action_type}' has not been implemented"
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=jsonable_encoder({"detail": exc.errors(), "body": action}),
        )

    _check_action_does_not_exist(action_as_dict)

    insert_team = client.index(
        index=settings.ACTION_INDEX,
        id=str(uuid.uuid4()),
        body=action_as_dict,
        refresh="wait_for",
    )

    action_as_dict["key"] = insert_team["_id"]

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=action_as_dict
    )


@router.put("/{key}")
def update_action(
        action: Action,
        key: str,
):

    try:
        action.modified_date = utils.current_time()
        action_as_dict: dict = act.type_map[action.action_type](**action.dict(exclude_none=True)).dict(exclude_none=True)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Action '{action.action_type}' has not been implemented"
        )
    except ValidationError as exc:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=jsonable_encoder({"detail": exc.errors(), "body": action}),
        )

    try:
        original_action = client.get(
            index=settings.ACTION_INDEX,
            id=key
        )["_source"]

        action_as_dict['create_date'] = original_action['create_date']
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"action with key '{key}' does not exist"
        )

    insert_action = client.index(
        index=settings.ACTION_INDEX,
        id=key,
        body=action_as_dict,
        refresh="wait_for",
    )

    action_as_dict["key"] = insert_action["_id"]

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=action_as_dict
    )


@router.delete("/{key}")
def delete_action(
        key: str
):
    try:
        client.delete(
            index=settings.ACTION_INDEX,
            id=key,
            refresh="wait_for"
        )
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action with id '{key}' does not exist"
        )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content="Action deleted"
    )


@router.get("/{key}")
def get_action(
        key: str,
):
    doc = _get_action(key)
    return JSONResponse(status_code=status.HTTP_200_OK, content=doc)


class NotFoundError:
    pass


def _get_action(key: str):
    try:
        response = client.get(
            index=settings.ACTION_INDEX,
            id=key
        )
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action with id '{key}' does not exist"
        )
    response["_source"]["key"] = response["_id"]
    return response


def _check_action_does_not_exist(action: dict):
    query = {
        "query": {
            "bool": {
                "must": {
                    "match": {
                        "action_name": action["action_name"]
                    }
                }
            }
        }
    }

    response = client.search(
        index=settings.ACTION_INDEX,
        body=query
    )

    if response["hits"]["total"]["value"] > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Action '{action['action_name']}' already exists"
        )
