from dotenv import load_dotenv
load_dotenv()  # load environment variables from .env

import os
import aiohttp
import asyncio
import json
import re
from pathlib import Path

GROK_API_KEY = os.getenv("GROK_API_KEY")
GROK_API_URL = "https://api.groq.com/openai/v1/chat/completions"

async def query_grok(content: str) -> str:
    messages = [
        {
            "role": "system",
            "content": """You are a creative mathematics educator who generates unique and engaging content..."""
        },
        {
            "role": "user",
            "content": content
        }
    ]
    
    payload = {
        "model": "llama3-groq-70b-8192-tool-use-preview",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048
    }
    
    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(GROK_API_URL, headers=headers, json=payload) as response:
            if response.status == 200:
                data = await response.json()
                response_content = data['choices'][0]['message']['content']
                print("Response from GROK API:")
                print(response_content)
                return response_content
            else:
                error_text = await response.text()
                raise Exception(f"Failed to query GROK API: {error_text}")

async def process_pdf_content(pdf_content: str, filename: str) -> tuple[str, str]:
    summary = await query_grok(pdf_content)
    return filename, summary 

async def query_grok_quiz(content: str) -> str:
    messages = [
        {
            "role": "system",
            "content": """You are an expert quiz generator for educational content. 
            Generate multiple choice questions that test understanding of key concepts.
            
            Format your response as a JSON array of questions. Each question must have:
            {
                "question": "clear, concise question text",
                "options": ["correct answer", "plausible wrong answer", "plausible wrong answer", "plausible wrong answer"],
                "correctAnswer": 0
            }
            
            Guidelines:
            - Questions should test understanding, not just memorization
            - Wrong answers should be plausible but clearly incorrect
            - Include 3-5 questions per section
            - Vary question difficulty
            - Focus on core concepts and practical applications
            - Keep language clear and unambiguous
            
            IMPORTANT: Return ONLY the JSON array, no additional text or formatting."""
        },
        {
            "role": "user",
            "content": f"Generate quiz questions for this content:\n\n{content}"
        }
    ]
    
    payload = {
        "model": "llama3-groq-70b-8192-tool-use-preview",
        "messages": messages,
        "temperature": 0.3,  # lower temperature for more consistent output
        "max_tokens": 2048   # reduced since quiz responses are shorter
    }
    
    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(GROK_API_URL, headers=headers, json=payload) as response:
            if response.status == 200:
                data = await response.json()
                return data['choices'][0]['message']['content']
            else:
                error_text = await response.text()
                raise Exception(f"Failed to generate quiz: {error_text}")

async def generate_quiz(content: str) -> list:
    try:
        print("\n--- Starting Quiz Generation ---")
        print("Content length:", len(content))
        response = await query_grok_quiz(content)
        print("\nRaw API Response:", response)
        
        quiz_data = json.loads(response)
        print("\nParsed Quiz Data:", quiz_data)
        
        # validate quiz format
        for question in quiz_data:
            print("\nValidating question:", question)
            if not all(key in question for key in ["question", "options", "correctAnswer"]):
                print("Missing required fields")
                raise ValueError("Invalid question format")
            if len(question["options"]) != 4:
                print("Wrong number of options:", len(question["options"]))
                raise ValueError("Each question must have exactly 4 options")
            if not isinstance(question["correctAnswer"], int) or not 0 <= question["correctAnswer"] <= 3:
                print("Invalid correctAnswer:", question["correctAnswer"])
                raise ValueError("correctAnswer must be 0-3")
            print("Question validated successfully")
        
        return quiz_data
    except json.JSONDecodeError as e:
        print("\nJSON Parse Error:", str(e))
        print("Raw response was:", response)
        return []
    except ValueError as e:
        print("\nValidation Error:", str(e))
        return []
    except Exception as e:
        print("\nUnexpected Error:", str(e))
        print("Type:", type(e))
        return []

async def generate_course_details(title: str, content: str) -> dict:
    try:
        prompt = f"""Given the course title "{title}", generate a detailed course description in JSON format.
        Include the following fields:
        - description (markdown format, 2-3 paragraphs)
        - difficulty (Beginner/Intermediate/Advanced)
        - estimated_hours (integer between 10-40)
        - learning_outcomes (list of 4-6 specific outcomes)
        - prerequisites (list of 0-3 requirements)
        - skills_gained (list of 4-6 specific skills)
        - course_highlights (list of 4-6 main topics)
        
        Make it specific to {title} and keep it professional."""

        response = await query_grok(prompt)
        
        # fallback defaults if generation fails
        default_response = {
            "description": f"A comprehensive course covering {title}.",
            "difficulty": "Intermediate",
            "estimated_hours": 20,
            "learning_outcomes": [
                f"Understand core concepts of {title}",
                "Apply theoretical knowledge to practical problems",
                "Develop analytical thinking skills"
            ],
            "prerequisites": [],
            "skills_gained": [
                "Analytical thinking",
                "Problem solving",
                "Technical proficiency"
            ],
            "course_highlights": [
                "Core concepts",
                "Practical applications",
                "Case studies"
            ]
        }

        try:
            # try to parse the AI response
            course_details = json.loads(response)
            return course_details
        except:
            print("Failed to parse AI response, using defaults")
            return default_response

    except Exception as e:
        print(f"Error generating course details: {e}")
        return default_response