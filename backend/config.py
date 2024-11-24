import dotenv
import os

dotenv.load_dotenv()

class Config:
    USE_GROQ: bool = False
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    MODEL_NAME: str = "meta-llama/Llama-3.2-3B-Instruct"
    DEFAULT_MAX_TOKENS: int = 100
    DEFAULT_TEMPERATURE: float = 0.5
    HUGGINGFACE_ACCESS_TOKEN: str = os.getenv("HUGGINGFACE_ACCESS_TOKEN", "")