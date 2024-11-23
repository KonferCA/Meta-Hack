from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn
import os

# load environment variables
load_dotenv()

# initialize fastapi app
app = FastAPI(
    title="Study AI Backend",
    description="Backend API for educational AI study assistant",
    version="1.0.0"
)

# configure cors 
app.add_middleware( 
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy! :)"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 