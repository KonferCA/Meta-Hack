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

from sse_starlette.sse import EventSourceResponse

import asyncio  # Add this at the top

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
    async def generate_with_progress():
        # Define sections list at the start
        sections = [
            "Introduction",
            "Key Concepts",
            "Fundamentals",
            "Core Principles",
            "Practical Applications",
            "Advanced Topics",
            "Case Studies",
            "Summary and Conclusions"
        ]
        pages_per_section = 3
        
        # Create initial course
        course = Course(
            title=title,
            description=description,
            professor_id=current_user.id
        )
        db.add(course)
        db.commit()
        db.refresh(course)
        
        # Send the course ID immediately after creation
        yield json.dumps({
            "courseId": course.id
        })
        
        # Helper function for progress updates
        async def send_progress(type_name, status, current, total, extra_stats=None):
            stats = {
                "current": current,
                "total": total,
                "percentage": round((current / total) * 100, 1)
            }
            if extra_stats:
                stats.update(extra_stats)
            
            yield json.dumps({
                "type": type_name,
                "status": status,
                "stats": stats
            })
            await asyncio.sleep(0.2)

        # Initial course creation progress
        try:
            # Generate course details first
            course_details = await generate_course_details(title, content)
            course.difficulty = course_details.get("difficulty")
            course.estimated_hours = course_details.get("estimated_hours")
            course.learning_outcomes = course_details.get("learning_outcomes", [])
            db.commit()

            # Send progress updates for course details generation
            steps = ["Analyzing content", "Determining difficulty", "Estimating duration", "Generating outcomes", "Finalizing details"]
            for i, step in enumerate(steps, 1):
                yield json.dumps({
                    "type": "details",
                    "status": "generating" if i < len(steps) else "completed",
                    "stats": {
                        "current": i,
                        "total": len(steps),
                        "percentage": (i / len(steps)) * 100,
                        "step": step,
                        "difficulty": course_details.get("difficulty"),
                        "estimatedHours": course_details.get("estimated_hours"),
                        "outcomesCount": len(course_details.get("learning_outcomes", []))
                    }
                })
                await asyncio.sleep(0.2)
        except Exception as e:
            logger.error(f"Error generating course details: {e}")
            # Send error status
            yield json.dumps({
                "type": "details",
                "status": "error",
                "stats": {
                    "step": "Error generating course details",
                    "error": str(e)
                }
            })

        # Content generation progress
        total_sections = len(sections)
        total_pages = total_sections * pages_per_section
        current_page = 0
        total_word_count = 0

        for section_num, section_title in enumerate(sections, 1):
            # Section creation progress
            yield json.dumps({
                "type": "content",
                "status": "creating_section",
                "stats": {
                    "sectionCount": section_num,
                    "totalSections": total_sections,
                    "pageCount": current_page,
                    "totalPages": total_pages,
                    "percentage": round((section_num / total_sections) * 100, 1),
                    "currentSection": section_title,
                    "step": f"Creating section: {section_title}",
                    "wordCount": total_word_count
                }
            })
            await asyncio.sleep(0.2)

            section = Section(title=section_title, order=section_num, course_id=course.id)
            db.add(section)
            db.commit()
            db.refresh(section)

            for page_num in range(pages_per_section):
                current_page += 1
                
                # Page generation progress
                yield json.dumps({
                    "type": "content",
                    "status": "generating_page",
                    "stats": {
                        "sectionCount": section_num,
                        "totalSections": total_sections,
                        "pageCount": current_page,
                        "totalPages": total_pages,
                        "currentSection": section_title,
                        "currentPage": f"Page {page_num + 1}",
                        "percentage": round((current_page / total_pages) * 100, 1),
                        "step": f"Generating content for {section_title} - Page {page_num + 1}",
                        "wordCount": total_word_count
                    }
                })
                await asyncio.sleep(0.2)

                # Generate page content
                page_prompts = {
                    0: f"Generate an overview and introduction for the '{section_title}' section about {title}.",
                    1: f"Generate detailed explanations and examples for the '{section_title}' section about {title}.",
                    2: f"Generate practical applications and key takeaways for the '{section_title}' section about {title}."
                }
                content_text = await query_grok(page_prompts[page_num])
                
                # Update word count before creating the page
                total_word_count += len(content_text.split())
                
                # Create page
                page = Page(
                    content=content_text,
                    order=page_num + 1,
                    section_id=section.id,
                    course_id=course.id
                )
                db.add(page)
                db.commit()

                # Send progress update after page creation
                yield json.dumps({
                    "type": "content",
                    "status": "page_completed",
                    "stats": {
                        "sectionCount": section_num,
                        "totalSections": total_sections,
                        "pageCount": current_page,
                        "totalPages": total_pages,
                        "currentSection": section_title,
                        "currentPage": f"Page {page_num + 1}",
                        "percentage": round((current_page / total_pages) * 100, 1),
                        "wordCount": total_word_count,
                        "step": f"Completed {section_title} - Page {page_num + 1}"
                    }
                })
                await asyncio.sleep(0.2)

        # Final content completion message
        yield json.dumps({
            "type": "content",
            "status": "completed",
            "stats": {
                "pageCount": total_pages,
                "totalPages": total_pages,
                "currentSection": "Course generation complete",
                "percentage": 100,
                "wordCount": total_word_count
            }
        })

        # Generate and save quiz
        yield json.dumps({
            "type": "quiz",
            "status": "pending"
        })
        questions_data = await generate_quiz(content_text)

        # Create quiz with both section_id and course_id
        quiz = Quiz(
            section_id=section.id,
            course_id=course.id
        )
        db.add(quiz)
        db.commit()
        db.refresh(quiz)

        # Create questions with their choices
        for q_data in questions_data:
            # Create the question
            question = QuizQuestion(
                quiz_id=quiz.id,
                question=q_data['question']
            )
            db.add(question)
            db.commit()
            db.refresh(question)
            
            # Create choices for the question
            for i, option_text in enumerate(q_data['options']):
                choice = QuizQuestionChoice(
                    quiz_question_id=question.id,
                    content=option_text
                )
                db.add(choice)
                db.commit()
                
                # If this is the correct answer, update the question
                if i == q_data['correctAnswer']:
                    question.correct_choice_id = choice.id
                    db.commit()

        yield json.dumps({
            "type": "quiz",
            "status": "completed",
            "stats": {
                "questionCount": len(questions_data),
                "optionCount": len(questions_data) * 4
            }
        })

    # Return the EventSourceResponse outside the generator function
    return EventSourceResponse(generate_with_progress())

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
                        "content": page.content
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

@app.post("/courses/{course_id}/enroll")
async def enroll_in_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # verify user is a student
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=403,
            detail="Only students can enroll in courses"
        )
    
    # check if course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found"
        )
    
    # check if already enrolled
    existing_enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == course_id
    ).first()
    
    if existing_enrollment:
        raise HTTPException(
            status_code=400,
            detail="Already enrolled in this course"
        )
    
    # create enrollment
    enrollment = Enrollment(
        student_id=current_user.id,
        course_id=course_id
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    
    return {"message": "Successfully enrolled in course"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        # log_level="debug"  # uncomment this if you want more detailed logs
    ) 
