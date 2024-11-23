from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# create sqlite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# create base class for models
Base = declarative_base()

# dependency for database sessions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 