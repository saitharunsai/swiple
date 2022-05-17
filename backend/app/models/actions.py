from app.models.base_model import BaseModel
from pydantic import EmailStr, Field, AnyHttpUrl
from typing import List, Optional, Literal
from app import constants as c


class Action(BaseModel):
    action_name: str
    action_type: str
    kwargs: object
    create_date: Optional[str]
    created_by: Optional[str]
    modified_date: Optional[str]


class Email(Action):
    notify_on: Literal["all", "failure", "success"]
    smtp_address: str = Field(placeholder="email-smtp.us-east-1.amazonaws.com", description="SMTP Address e.g. email-smtp.us-east-1.amazonaws.com")
    smtp_port: str = Field(placeholder="587", description="SMTP Port e.g. 587")
    sender_login: str = Field(placeholder="Username", description="SMTP Username")
    sender_password: str = Field(placeholder="Password", description="SMTP Password")
    sender_alias: EmailStr = Field(placeholder="some@email.com", description="The email address that will send the email.")
    receiver_emails: List[EmailStr] = Field(form_type="multi_column_select")


class OpsGenie(Action):
    notify_on: Literal["all", "failure", "success"]
    api_key: str
    priority: Literal["P1", "P2", "P3", "P4", "P5"]


class Slack(Action):
    notify_on: Literal["all", "failure", "success"]
    slack_webhook: AnyHttpUrl


type_map = {
    c.EMAIL: Email,
    c.OPS_GENIE: OpsGenie,
    c.SLACK: Slack,
}
