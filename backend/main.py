from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import uvicorn
import shutil
import os

import zipfile
from pathlib import Path
import io

import models
import database
from database import engine, get_db
from models import User, UserRole, Course, Section, Page, Enrollment, Quiz, QuizQuestion, QuizQuestionChoice, QuizResult  # update imports
from utils.grok import query_grok, process_pdf_content, generate_quiz, generate_course_details
from utils.pdf_processor import process_pdf, process_pdfs
import PyPDF2

import logging
from jose import JWTError, jwt  # replace the existing jwt import

import tempfile
import json

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# create tables
models.Base.metadata.create_all(bind=engine)

# setup password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# setup JWT
SECRET_KEY = "your-secret-key-here"  # move this to .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# setup OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

# configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str

# helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_note(db: Session, note_id: int, user_id: int):
    return db.query(models.Note).filter(models.Note.id == note_id and models.Note.student_id == user_id).first()

# add this function
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # decode jwt token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    # get user from database
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
        
    return user

# endpoints
@app.post("/register")
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # check if user exists
    db_user = get_user(db, user.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # validate role
    if user.role not in [UserRole.STUDENT, UserRole.PROFESSOR]:
        raise HTTPException(
            status_code=400,
            detail="Invalid role"
        )
    
    # create new user
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # create access token
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": db_user.email,
            "username": db_user.username,
            "role": db_user.role
        }
    }

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # authenticate user
    user = get_user(db, form_data.username)  # username field contains email
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # create access token
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "username": user.username,
            "role": user.role
        }
    }

@app.get("/users/me")
async def read_users_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = get_user(db, email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    return {
        "email": user.email,
        "username": user.username,
        "role": user.role
    } 

# 1. First, define all specific course routes (no parameters)
@app.get("/courses/teaching")
async def get_teaching_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # verify user is professor
    if current_user.role != UserRole.PROFESSOR:
        raise HTTPException(
            status_code=403,
            detail="Only professors can view teaching courses"
        )
    
    # get courses where user is professor
    courses = db.query(Course).filter(
        Course.professor_id == current_user.id
    ).all()
    
    return [
        {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "professor_id": course.professor_id,
            "difficulty": course.difficulty,
            "estimated_hours": course.estimated_hours
        }
        for course in courses
    ]

@app.get("/courses/enrolled")
async def get_enrolled_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # verify user is student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=403,
            detail="Only students can view enrolled courses"
        )
    
    # get enrolled courses
    enrolled_courses = db.query(Course).join(
        Enrollment, Course.id == Enrollment.course_id
    ).filter(
        Enrollment.student_id == current_user.id
    ).all()
    
    return [
        {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "professor_id": course.professor_id,
            "difficulty": course.difficulty,
            "estimated_hours": course.estimated_hours
        }
        for course in enrolled_courses
    ]

@app.get("/courses/available")
async def get_available_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # verify user is student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=403,
            detail="Only students can view available courses"
        )
    
    # get all courses except ones already enrolled in
    enrolled_courses = db.query(Enrollment.course_id).filter(
        Enrollment.student_id == current_user.id
    ).subquery()
    
    available_courses = db.query(Course).filter(
        ~Course.id.in_(enrolled_courses)
    ).all()
    
    return available_courses

@app.post("/courses/create")
async def create_course(
    title: str = Form(...),
    description: str = Form(...),
    content: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # generate course details using Grok
        course_details = await generate_course_details(title, description)
        logger.debug(f"Generated course details: {course_details}")
        
        # create course with generated details
        course = Course(
            title=title,
            description=description,
            professor_id=current_user.id,
            difficulty=course_details['difficulty'],
            estimated_hours=course_details['estimated_hours'],
            learning_outcomes=course_details['learning_outcomes'],
            prerequisites=course_details['prerequisites'],
            skills_gained=course_details['skills_gained'],
            course_highlights=course_details['course_highlights']
        )
        db.add(course)
        db.commit()
        db.refresh(course)

        # generate content and quiz using Grok
        content_text = await query_grok(f"Generate a detailed lesson about {title}")
        logger.debug(f"Generated content: {content_text}")
        
        questions = await generate_quiz(content_text)
        logger.debug(f"Generated quiz: {questions}")

        # create section
        section = Section(
            course_id=course.id,
            title="Introduction",
            order=1
        )
        db.add(section)
        db.commit()

        # create page with generated content
        page = Page(
            section_id=section.id,
            course_id=course.id,
            content=content_text,
            order=1
        )
        db.add(page)
        
        # create quiz with generated questions
        if questions:
            quiz = Quiz(
                section_id=section.id,
                course_id=course.id
            )
            db.add(quiz)
            db.commit()
            
            for q_data in questions:
                # first create the question
                question = QuizQuestion(
                    quiz_id=quiz.id,
                    question=q_data['question'],
                    correct_choice_id=None  # initially set to None
                )
                db.add(question)
                db.commit()
                db.refresh(question)
                
                # create all choices
                choices = []
                for i, option in enumerate(q_data['options']):
                    choice = QuizQuestionChoice(
                        quiz_question_id=question.id,
                        content=option
                    )
                    db.add(choice)
                    db.commit()
                    db.refresh(choice)
                    choices.append(choice)
                    
                    # store the correct choice
                    if i == q_data['correctAnswer']:
                        # update the question with correct choice id
                        question.correct_choice_id = choice.id
                        db.add(question)
                        db.commit()
        
        db.commit()
        
        return {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "professor_id": course.professor_id,
            "difficulty": course.difficulty,
            "estimated_hours": course.estimated_hours
        }
        
    except Exception as e:
        logger.exception("Error creating course")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create course: {str(e)}"
        )

# 2. Then, define all parameterized routes
@app.get("/courses/{course_id}")
async def get_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # get course
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # get sections with pages
    sections = db.query(Section).filter(Section.course_id == course_id).order_by(Section.order).all()
    
    # return course with sections
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "professor_id": course.professor_id,
        "created_at": course.created_at,
        "sections": [
            {
                "id": section.id,
                "title": section.title,
                "order": section.order,
                "content_url": section.content_url,
                "pages": [
                    {
                        "id": page.id,
                        "content": page.content,
                        "created_at": page.created_at
                    } for page in section.pages
                ]
            } for section in sections
        ]
    }

@app.get("/courses/{course_id}/details")
async def get_course_details(
    course_id: int,
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    professor = db.query(User).filter(User.id == course.professor_id).first()
    
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "professor_name": professor.username,
        "difficulty": course.difficulty,
        "estimated_hours": course.estimated_hours,
        "learning_outcomes": course.learning_outcomes or [],
        "prerequisites": course.prerequisites or [],
        "skills_gained": course.skills_gained or [],
        "course_highlights": course.course_highlights or []
    }

@app.get("/courses/{course_id}/progress")
async def get_course_progress(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can view progress")
    
    # get progress for each section
    progress = {}
    sections = db.query(Section).filter(Section.course_id == course_id).all()
    for section in sections:
        # TODO: Add actual progress tracking
        progress[section.id] = {
            "completed": False,
            "quiz_score": None
        }
    
    return progress

@app.get("/courses/{course_id}/students")
async def get_course_students(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course or course.professor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id).all()
    students = []
    for enrollment in enrollments:
        student = db.query(User).filter(User.id == enrollment.student_id).first()
        if student:
            # TODO: Calculate actual progress
            progress = 0
            students.append({
                "id": student.id,
                "username": student.username,
                "email": student.email,
                "progress": progress
            })
    
    return students

@app.post("/courses/{course_id}/sections")
async def create_section(
    course_id: int,
    title: str = Form(...),
    content_url: str = Form(...),
    order: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # verify user is professor and owns the course
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.professor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # create section
    section = Section(
        title=title,
        content_url=content_url,
        order=order,
        course_id=course_id
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    
    return section

# one route to give feedback
class FeedbackCreate(BaseModel):
    note_id: int
    like: bool
    message: Optional[str] = None

@app.post("/feedback")
async def feedback(fb: FeedbackCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resp = {
        "message": ""
    }

    if fb.message is None:
        if fb.like:
            fb.message = "I like this note's explanation. Try to use the similar explanation methods for similar topics."

    # store feedback
    new_fb = models.Feedback(
        student_id=current_user.id,
        note_id=fb.note_id,
        like=fb.like,
        message=fb.message
    )
    db.add(new_fb)
    db.commit()

    if not fb.like:
        # TODO: call model to generate new note
        pass
    else:
        # TODO: start using feedback to fine tune user model
        pass

    return resp

@app.post("/quizzes/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: int,
    answers: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    print("Received answers:", answers)  # debug print
        
    # calculate score and collect detailed results
    total_questions = len(quiz.questions)
    correct_answers = 0
    questions_results = []
    
    for question in quiz.questions:
        student_answer_id = answers.get(str(question.id))
        print(f"Question {question.id} - Student answer ID: {student_answer_id}")  # debug print
        
        student_choice = None
        if student_answer_id:
            student_choice = db.query(QuizQuestionChoice).filter(
                QuizQuestionChoice.id == student_answer_id
            ).first()
            
        correct_choice = db.query(QuizQuestionChoice).filter(
            QuizQuestionChoice.id == question.correct_choice_id
        ).first()
        
        is_correct = student_answer_id == question.correct_choice_id
        if is_correct:
            correct_answers += 1
            
        questions_results.append({
            "id": question.id,
            "question": question.question,
            "isCorrect": is_correct,
            "yourAnswer": student_choice.content if student_choice else "No answer provided",
            "correctAnswer": correct_choice.content
        })
    
    score = round((correct_answers / total_questions) * 100)
    
    # store result
    result = QuizResult(
        quiz_id=quiz_id,
        student_id=current_user.id,
        score=score
    )
    db.add(result)
    db.commit()
    
    print("Final results:", questions_results)  # debug print
    
    return {
        "score": score,
        "questions": questions_results
    }

@app.get("/courses/{course_id}/sections/{section_id}/quiz")
async def get_section_quiz(
    course_id: int,
    section_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # get quiz for the course
    quiz = db.query(Quiz).filter(Quiz.course_id == course_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # format quiz data for frontend
    quiz_data = {
        "id": quiz.id,
        "questions": []
    }

    for question in quiz.questions:
        question_data = {
            "id": question.id,
            "question": question.question,
            "choices": []
        }
        
        for choice in question.choices:
            choice_data = {
                "id": choice.id,
                "content": choice.content
            }
            question_data["choices"].append(choice_data)
        
        quiz_data["questions"].append(question_data)

    return quiz_data

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        # log_level="debug"  # uncomment this if you want more detailed logs
    ) 
