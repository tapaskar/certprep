"""Contact form endpoint — sends user messages to admin via SES."""

import logging
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["contact"])

SENDER = f"SparkUpCloud <{settings.ses_sender_email}>"
ADMIN_EMAIL = "admin@sparkupcloud.com"


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


@router.post("", status_code=status.HTTP_200_OK)
async def send_contact_message(body: ContactRequest):
    """Send a contact form message to admin."""
    if not body.name.strip() or not body.subject.strip() or not body.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All fields are required",
        )

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    html_body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1c1917; margin-bottom: 16px;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #57534e; width: 100px;">From:</td>
                <td style="padding: 8px 12px; color: #1c1917;">{body.name} &lt;{body.email}&gt;</td>
            </tr>
            <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #57534e;">Subject:</td>
                <td style="padding: 8px 12px; color: #1c1917;">{body.subject}</td>
            </tr>
            <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #57534e;">Time:</td>
                <td style="padding: 8px 12px; color: #78716c;">{timestamp}</td>
            </tr>
        </table>
        <div style="margin-top: 24px; padding: 20px; background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4;">
            <p style="color: #1c1917; white-space: pre-wrap; line-height: 1.6; margin: 0;">{body.message}</p>
        </div>
        <p style="margin-top: 16px; color: #a8a29e; font-size: 12px;">
            Reply directly to this email to respond to {body.name} at {body.email}
        </p>
    </div>
    """

    text_body = f"From: {body.name} <{body.email}>\nSubject: {body.subject}\nTime: {timestamp}\n\n{body.message}"

    try:
        ses = boto3.client("ses", region_name=settings.ses_region)
        ses.send_email(
            Source=SENDER,
            Destination={"ToAddresses": [ADMIN_EMAIL]},
            ReplyToAddresses=[body.email],
            Message={
                "Subject": {
                    "Data": f"[SparkUpCloud Contact] {body.subject}",
                    "Charset": "UTF-8",
                },
                "Body": {
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                    "Text": {"Data": text_body, "Charset": "UTF-8"},
                },
            },
        )
        logger.info("Contact form email sent from %s: %s", body.email, body.subject)
        return {"message": "Message sent successfully"}
    except ClientError as e:
        logger.error("SES error sending contact form: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message. Please try again later.",
        )
