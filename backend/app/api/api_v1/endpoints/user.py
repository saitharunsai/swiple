from fastapi import APIRouter
from fastapi.params import Depends
from fastapi.responses import JSONResponse
from app.core.users import current_active_user
from app.db.client import client
from app.config.settings import settings
from fastapi import status

router = APIRouter(
    dependencies=[Depends(current_active_user)]
)


@router.get("")
def users():
    docs = client.search(
        index=settings.USER_INDEX,
        body={
            "query": {
                "match_all": {}
            }
        },
        size=1000,
    )["hits"]["hits"]

    docs_response = []
    for doc in docs:
        docs_response.append(
            {
                "email": doc["_source"]["email"],
                "is_active": doc["_source"]["is_active"],
                "is_superuser": doc["_source"]["is_superuser"],
                "is_verified": doc["_source"]["is_verified"],
            }
        )
    return JSONResponse(status_code=status.HTTP_200_OK, content=docs_response)
