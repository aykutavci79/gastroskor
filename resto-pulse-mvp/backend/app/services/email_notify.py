from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_panel_email(
    *,
    to_email: str,
    subject: str,
    body_text: str,
    cta_label: str | None = None,
    cta_url: str | None = None,
) -> tuple[bool, str | None]:
    if not to_email.strip():
        return False, "empty recipient"

    lines = [body_text, ""]
    if cta_label and cta_url:
        lines.extend([f"{cta_label}: {cta_url}", ""])
    lines.append("— GastroSkor Restoran Paneli")
    text = "\n".join(lines)

    if settings.email_provider == "mock" or settings.environment == "development":
        logger.info("EMAIL -> %s subject=%s\n%s", to_email, subject, text)
        return True, None

    if settings.email_provider == "smtp":
        if not settings.smtp_host or not settings.email_from:
            return False, "SMTP not configured"
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.email_from
        message["To"] = to_email
        message.set_content(text)
        try:
            # Port 465 = implicit SSL (cPanel / Guzel Hosting gibi saglayicilar)
            if settings.smtp_port == 465:
                with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=20) as server:
                    if settings.smtp_user and settings.smtp_password:
                        server.login(settings.smtp_user, settings.smtp_password)
                    server.send_message(message)
            else:
                with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
                    if settings.smtp_use_tls:
                        server.starttls()
                    if settings.smtp_user and settings.smtp_password:
                        server.login(settings.smtp_user, settings.smtp_password)
                    server.send_message(message)
            return True, None
        except Exception as exc:
            logger.exception("SMTP send failed for %s", to_email)
            return False, str(exc)

    return False, f"Unsupported email provider: {settings.email_provider}"
