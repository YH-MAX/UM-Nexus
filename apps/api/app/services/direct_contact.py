"""Normalize seller-selected contact destinations; never accept arbitrary links."""

import re
from urllib.parse import quote

from pydantic import EmailStr, TypeAdapter, ValidationError


email_address = TypeAdapter(EmailStr)


def direct_contact_destination(method: str | None, value: str | None) -> tuple[str, str]:
    value = (value or "").strip()
    if method == "telegram":
        match = re.fullmatch(r"(?:https://(?:t\.me|telegram\.me)/|@)?([A-Za-z][A-Za-z0-9_]{4,31})/?", value)
        if not match:
            raise ValueError("Enter a valid Telegram username, for example @seller_um.")
        username = match.group(1)
        return f"@{username}", f"https://t.me/{username}"
    if method == "whatsapp":
        value = re.sub(r"^https://wa\.me/", "", value).rstrip("/")
        if not re.fullmatch(r"\+?[0-9 ()\-.]+", value):
            raise ValueError("Enter a WhatsApp number in international format, for example +60123456789.")
        number = re.sub(r"[+ ()\-.]", "", value)
        if number.startswith("00"):
            number = number[2:]
        if not re.fullmatch(r"[1-9][0-9]{6,14}", number):
            raise ValueError("Enter a WhatsApp number including its country code, for example +60123456789.")
        return f"+{number}", f"https://wa.me/{number}"
    if method == "email":
        try:
            normalized = str(email_address.validate_python(value))
        except ValidationError as error:
            raise ValueError("Enter a valid contact email address.") from error
        return normalized, f"mailto:{quote(normalized, safe='@.')}"
    raise ValueError("Choose WhatsApp, Telegram or email for direct buyer contact.")
