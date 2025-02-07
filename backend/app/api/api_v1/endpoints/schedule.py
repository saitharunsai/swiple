import json
from typing import Optional

import requests
from app.core.schedulers.scheduler import Schedule
from app.core.users import current_active_user
from app.settings import settings
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.params import Depends
from fastapi.responses import JSONResponse

router = APIRouter(dependencies=[Depends(current_active_user)])


@router.get("/json-schema")
def json_schema():
    schema = Schedule.schema()
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=schema,
    )


@router.get("")
def list_schedules(
    request: Request,
    dataset_id: Optional[str] = None,
    datasource_id: Optional[str] = None,
):
    if dataset_id and datasource_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expected either 'dataset_id' or 'datasource_id'",
        )

    response = requests.get(
        url=f"{settings.SCHEDULER_API_URL}/api/v1/schedules",
        params={"dataset_id": dataset_id, "datasource_id": datasource_id},
        headers=request.headers,
        cookies=request.cookies,
    )
    return JSONResponse(
        status_code=response.status_code,
        content=response.json(),
    )


@router.post("")
def create_schedule(
    dataset_id: str,
    schedule: Schedule,
    request: Request,
):
    payload = json.dumps(jsonable_encoder(schedule.dict(exclude_none=True)))
    response = requests.post(
        url=f"{settings.SCHEDULER_API_URL}/api/v1/schedules",
        params={"dataset_id": dataset_id},
        data=payload,
        headers=request.headers,
        cookies=request.cookies,
    )
    return JSONResponse(
        status_code=response.status_code,
        content=response.json(),
    )


@router.get("/{schedule_id}")
def get_schedule(
    schedule_id: str,
    request: Request,
):
    response = requests.get(
        url=f"{settings.SCHEDULER_API_URL}/api/v1/schedules/{schedule_id}",
        headers=request.headers,
        cookies=request.cookies,
    )
    return JSONResponse(
        status_code=response.status_code,
        content=response.json(),
    )


@router.put("/{schedule_id}")
def update_schedule(
    schedule_id: str,
    schedule: Schedule,
    request: Request,
):
    payload = json.dumps(jsonable_encoder(schedule.dict(exclude_none=True)))
    response = requests.put(
        url=f"{settings.SCHEDULER_API_URL}/api/v1/schedules/{schedule_id}",
        data=payload,
        headers=request.headers,
        cookies=request.cookies,
    )
    return JSONResponse(
        status_code=response.status_code,
        content=response.json(),
    )


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: str,
    request: Request,
):
    response = requests.delete(
        url=f"{settings.SCHEDULER_API_URL}/api/v1/schedules/{schedule_id}",
        headers=request.headers,
        cookies=request.cookies,
    )
    return JSONResponse(
        status_code=response.status_code,
        content=response.json(),
    )


@router.delete("")
def delete_schedules(
    request: Request,
    dataset_id: Optional[str] = None,
    datasource_id: Optional[str] = None,
):
    if dataset_id and datasource_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expected either 'dataset_id' or 'datasource_id'",
        )

    if not dataset_id and not datasource_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expected either 'dataset_id' or 'datasource_id'",
        )

    response = None

    if dataset_id:
        response = requests.delete(
            url=f"{settings.SCHEDULER_API_URL}/api/v1/schedules",
            params={"dataset_id": dataset_id},
            headers=request.headers,
            cookies=request.cookies,
        )
    elif datasource_id:
        response = requests.delete(
            url=f"{settings.SCHEDULER_API_URL}/api/v1/schedules",
            params={"datasource_id": datasource_id},
            headers=request.headers,
            cookies=request.cookies,
        )

    return JSONResponse(
        status_code=response.status_code,
        content=response.json(),
    )


@router.post("/next-run-times")
def next_schedule_run_times(
    schedule: Schedule,
    request: Request,
):
    payload = json.dumps(jsonable_encoder(schedule.dict(exclude_none=True)))
    response = requests.post(
        url=f"{settings.SCHEDULER_API_URL}/api/v1/schedules/next-run-times",
        data=payload,
        headers=request.headers,
        cookies=request.cookies,
    )
    return JSONResponse(
        status_code=response.status_code,
        content=response.json(),
    )
