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
from models import User, UserRole, Course, Section, Page  # update imports
from utils.grok import query_grok, process_pdf_content
from utils.pdf_processor import process_pdf, process_pdfs
import PyPDF2

import logging
from jose import JWTError, jwt  # replace the existing jwt import

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
    allow_origins=[
        "http://localhost:5173",  # development
        "http://195.242.13.94",   # production
        "https://195.242.13.94",  # https production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
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

# course management endpoints
@app.get("/courses")
async def get_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # if student, return enrolled courses
    if current_user.role == UserRole.STUDENT:
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
        course_ids = [enrollment.course_id for enrollment in enrollments]
        courses = db.query(Course).filter(Course.id.in_(course_ids)).all()
    # if professor, return created courses
    else:
        courses = db.query(Course).filter(Course.professor_id == current_user.id).all()
    
    return courses

@app.post("/courses")
async def create_course(
    title: str = Form(...),
    description: str = Form(...),
    content: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # verify user is professor
        if current_user.role != UserRole.PROFESSOR:
            raise HTTPException(
                status_code=403,
                detail="Only professors can create courses"
            )
        
        # validate file type
        if not content.filename.endswith('.zip'):
            raise HTTPException(
                status_code=400,
                detail="Only ZIP files are allowed"
            )

        # create course directory with timestamp
        timestamp = datetime.now().timestamp()
        course_dir = Path(f"courses/{timestamp}")
        course_dir.mkdir(parents=True, exist_ok=True)
        
        # save and process zip file
        content_bytes = await content.read()
        
        try:
            with zipfile.ZipFile(io.BytesIO(content_bytes), 'r') as zip_ref:
                # verify zip contains PDFs
                pdf_files = []
                for file_info in zip_ref.filelist:
                    if file_info.filename.lower().endswith('.pdf'):
                        pdf_content = zip_ref.read(file_info)
                        pdf_files.append((file_info.filename, pdf_content))
                
                if not pdf_files:
                    raise HTTPException(
                        status_code=400,
                        detail="ZIP file must contain at least one PDF"
                    )
                
                # create course in database
                db_course = Course(
                    title=title,
                    description=description,
                    professor_id=current_user.id,
                )
                db.add(db_course)
                db.commit()
                db.refresh(db_course)
                
                # process pdfs and create sections/pages
                for filename, pdf_content in pdf_files:
                    try:
                        # extract text and generate markdown pages
                        filename, markdown_pages = await process_pdf(filename, pdf_content)
                        
                        # create section
                        section = Section(
                            title=Path(filename).stem,
                            content_url=str(course_dir / "content" / filename),
                            order=len(db_course.sections) + 1,
                            course_id=db_course.id
                        )
                        db.add(section)
                        db.commit()
                        db.refresh(section)
                        
                        # create pages for each markdown content
                        for i, page_content in enumerate(markdown_pages):
                            page = Page(
                                content=page_content,
                                course_id=db_course.id,
                                section_id=section.id,
                                order=i + 1  # add order field to Page model
                            )
                            db.add(page)
                            db.commit()
                            
                    except Exception as e:
                        logger.error(f"Error processing {filename}: {str(e)}")
                        db.rollback()
                        if course_dir.exists():
                            shutil.rmtree(course_dir)
                        raise HTTPException(
                            status_code=500,
                            detail=f"Error processing {filename}: {str(e)}"
                        )
                
                # extract all files
                zip_ref.extractall(course_dir / "content")
                
                return db_course
                
        except zipfile.BadZipFile:
            raise HTTPException(
                status_code=400,
                detail="Invalid ZIP file format"
            )
            
    except HTTPException:
        # cleanup on HTTP exceptions
        if 'course_dir' in locals() and course_dir.exists():
            shutil.rmtree(course_dir)
        if 'db_course' in locals():
            db.delete(db_course)
            db.commit()
        raise
        
    except Exception as e:
        # cleanup on unexpected errors
        if 'course_dir' in locals() and course_dir.exists():
            shutil.rmtree(course_dir)
        if 'db_course' in locals():
            db.delete(db_course)
            db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error creating course: {str(e)}"
        )

@app.post("/courses/{course_id}/enroll")
async def enroll_in_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=403,
            detail="Only students can enroll in courses"
        )
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found"
        )
    
    # TODO: Add enrollment logic here
    # You'll need to create an Enrollment model and handle the enrollment process
    
    return {"message": "Successfully enrolled"}

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

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        # log_level="debug"  # uncomment this if you want more detailed logs
    ) 
