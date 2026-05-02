"""Shared email-sending helper.

Wraps boto3 SES so call sites don't have to know about AWS clients.
Used by:
  - app.api.auth (signup verification codes, password resets)
  - app.api.payments (subscription confirmations + refunds)

Returns False on failure rather than raising — emails are usually
non-critical and shouldn't 500 the request that triggered them. The
underlying SES error is logged for ops visibility.
"""

import logging

import boto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)

SENDER = f"SparkUpCloud <{settings.ses_sender_email}>"


def send_email(to: str, subject: str, body_html: str, body_text: str) -> bool:
    """Send an email via AWS SES. Returns True on success, False on any error.

    The text part isn't optional — Gmail and others will mark
    HTML-only emails as suspicious.
    """
    try:
        ses = boto3.client("ses", region_name=settings.ses_region)
        ses.send_email(
            Source=SENDER,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Html": {"Data": body_html, "Charset": "UTF-8"},
                    "Text": {"Data": body_text, "Charset": "UTF-8"},
                },
            },
        )
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except ClientError as e:
        logger.error("SES error sending to %s: %s", to, e)
        return False
