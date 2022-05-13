from typing import Optional

from fastapi import APIRouter, status
from fastapi.params import Depends
from fastapi.responses import JSONResponse
from app.core.users import current_active_user
from app.db.client import client
from app.config.settings import settings
from fastapi import HTTPException, status

router = APIRouter(
    dependencies=[Depends(current_active_user)]
)


@router.get("")
def teams(
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
        docs_response.append(
            dict(**doc["_source"])
        )
    return JSONResponse(status_code=status.HTTP_200_OK, content=docs_response)


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
