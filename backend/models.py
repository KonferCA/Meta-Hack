from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy import Column, ColumnClause, Integer, String, Boolean, Enum, ForeignKey, DateTime, Float, JSON
from database import Base
import enum
from datetime import datetime
from sqlalchemy.orm import relationship

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
    weight_path = Column(String, nullable=True)
    enrollments = relationship("Enrollment", back_populates="student")

    # relationships
    quiz_results = relationship("QuizResult", back_populates="student")

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
    title = Column(String)
    description = Column(String)
    professor_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    enrollments = relationship("Enrollment", back_populates="course")
    difficulty = Column(String)
    estimated_hours = Column(Integer)
    learning_outcomes = Column(JSON)
    prerequisites = Column(JSON)
    skills_gained = Column(JSON)
    course_highlights = Column(JSON)

    # relationships
    sections = relationship("Section", back_populates="course")
    pages = relationship("Page", back_populates="course")
    quizzes = relationship("Quiz", back_populates="course")

class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content_url = Column(String)
    order = Column(Integer)
    course_id = Column(Integer, ForeignKey("courses.id"))

    # relationships
    course = relationship("Course", back_populates="sections")
    pages = relationship("Page", back_populates="section")
    quizzes = relationship("Quiz", back_populates="section")

class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    order = Column(Integer)
    section_id = Column(Integer, ForeignKey("sections.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    section = relationship("Section", back_populates="pages")
    course = relationship("Course", back_populates="pages")

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    page_id = Column(Integer, ForeignKey("pages.id"))
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    note_id = Column(Integer, ForeignKey("notes.id"))
    like = Column(Boolean, default=False, nullable=False)
    message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    course = relationship("Course", back_populates="quizzes")
    section = relationship("Section", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz")
    results = relationship("QuizResult", back_populates="quiz")

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question = Column(String, nullable=False)
    correct_choice_id = Column(Integer, ForeignKey("quiz_question_choices.id"), nullable=True)

    # relationships
    quiz = relationship("Quiz", back_populates="questions")
    choices = relationship("QuizQuestionChoice", 
                         back_populates="question",
                         foreign_keys="[QuizQuestionChoice.quiz_question_id]")
    correct_choice = relationship("QuizQuestionChoice",
                                foreign_keys="[QuizQuestion.correct_choice_id]",
                                uselist=False)

class QuizQuestionChoice(Base):
    __tablename__ = "quiz_question_choices"

    id = Column(Integer, primary_key=True, index=True)
    quiz_question_id = Column(Integer, ForeignKey("quiz_questions.id"))
    content = Column(String, nullable=False)

    # relationships
    question = relationship("QuizQuestion", 
                          back_populates="choices",
                          foreign_keys="[QuizQuestionChoice.quiz_question_id]")

class QuizResult(Base):
    # todo: store content and wrong quiz question
    __tablename__ = "quiz_results"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    score = Column(Float)
    wrong_questions = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # relationships
    quiz = relationship("Quiz", back_populates="results")
    student = relationship("User", back_populates="quiz_results")
