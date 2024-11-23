from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, DateTime
from database import Base
import enum
from datetime import datetime

class UserRole(str, enum.Enum):
    STUDENT = "student"
    PROFESSOR = "professor"

class UserBase(BaseModel):
    email: EmailStr
    username: str
    role: UserRole = UserRole.STUDENT

class UserCreate(UserBase):
    password: str

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default=UserRole.STUDENT)

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None 

class CourseBase(BaseModel):
    title: str
    description: str

class CourseCreate(CourseBase):
    pass

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    professor_id = Column(Integer, ForeignKey("users.id"))
    content_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content_url = Column(String)
    order = Column(Integer)
    course_id = Column(Integer, ForeignKey("courses.id"))

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    enrolled_at = Column(DateTime, default=datetime.utcnow) 
