from app.models.base_model import BaseModel
from pydantic import EmailStr, Field, AnyHttpUrl
from typing import List, Optional, Literal, Union
from app import constants as c


class EmailIntegration(BaseModel):
    class Config:
        title = "Email"
    smtp_address: str = Field(placeholder="email-smtp.us-east-1.amazonaws.com", description="SMTP Address e.g. email-smtp.us-east-1.amazonaws.com")
    smtp_port: str = Field(placeholder="587", description="SMTP Port e.g. 587")
    sender_login: str = Field(placeholder="Username", description="SMTP Username")
    sender_password: str = Field(placeholder="Password", description="SMTP Password")
    sender_alias: EmailStr = Field(placeholder="some@email.com", description="The email address that will send the email.")


class EmailDetails(BaseModel):
    notify_on: Literal["all", "failure", "success"]
    receiver_emails: List[EmailStr] = Field(form_type="multi_column_select")


class Email(EmailIntegration, EmailDetails):
    pass


class SlackIntegration(BaseModel):
    class Config:
        title = "Slack"
    slack_webhook: AnyHttpUrl


class SlackDetails(BaseModel):
    notify_on: Literal["all", "failure", "success"]


class Slack(SlackIntegration, SlackDetails):
    notify_on: Literal["all", "failure", "success"]
    slack_webhook: AnyHttpUrl


class OpsGenieIntegration(BaseModel):
    class Config:
        title = "OpsGenie"
    api_key: str


class OpsGenieDetails(BaseModel):
    action_name: str
    notify_on: Literal["all", "failure", "success"]
    priority: Literal["P1", "P2", "P3", "P4", "P5"]


class OpsGenie(OpsGenieIntegration, OpsGenieDetails):
    pass


class IntegrationAction(BaseModel):
    action_name: str
    action_type: str
    kwargs: Union[OpsGenieIntegration, SlackIntegration, EmailIntegration]
    create_date: Optional[str]
    created_by: Optional[str]
    modified_date: Optional[str]


class DatasetAction(BaseModel):
    action_name: str
    action_type: str
    kwargs: Union[OpsGenie, Slack, Email]
    create_date: Optional[str]
    created_by: Optional[str]
    modified_date: Optional[str]


integration_actions = {
    c.EMAIL: Email,
    c.OPS_GENIE: OpsGenie,
    c.SLACK: Slack,
}
