from enum import Enum


class AppRole(str, Enum):
    STUDENT = "student"
    ORGANIZER = "organizer"
    MODERATOR = "moderator"
    ADMIN = "admin"
