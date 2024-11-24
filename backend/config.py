import os
from pathlib import Path
from dotenv import load_dotenv

# load from the correct path
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

class Config:
    USE_GROQ: bool = True
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY")
    MODEL_NAME: str = "meta-llama/Llama-3.2-3B-Instruct"
    DEFAULT_MAX_TOKENS: int = 100
    DEFAULT_TEMPERATURE: float = 0.5
    HUGGINGFACE_ACCESS_TOKEN: str = os.getenv("HUGGINGFACE_ACCESS_TOKEN", "")