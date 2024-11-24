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
            "content": """You are a creative mathematics educator who generates unique and engaging content. 
            Here's how to structure your responses, adapting your approach for each topic:
            
            # 📚 Main Topic Title
            
            > 💡 **Key Insight:** Opening concept that grabs attention...
            
            ## 🎯 1. Core Concept
            Clear explanation of the fundamental idea, using rich formatting and examples.
            
            ### Example
            > **Example:** Demonstrate a practical case...
            
            ***
            
            ## 🔑 2. Key Properties
            
            | Property | Description |
            |----------|-------------|
            | First    | Details...  |
            | Second   | Details...  |
            
            * 📍 Major point one
                * Sub-point A
                * Sub-point B
            * 📍 Major point two
            
            ---
            
            ## ⚡ 3. Mathematical Expression
            
            > 🔍 **Note:** Pay special attention to this concept
            
            Here's how we express this elegantly:
            
            $inline-math-example$
            
            For more complex equations:
            $$
            display-math-example
            $$
            
            ___
            
            ## 🎨 Optional Sections (choose 2-3):
            
            ### 🤔 Common Misconceptions
            * ❌ **Misconception:**
        * ✅ **Reality:**
            * 💡 **Remember:**
            
            ### 🌍 Real-world Applications
            1. 🏭 **Industry:** application...
            2. 🏠 **Daily Life:** application...
            
            ### 💭 Thought Experiments
            > 🌟 **Imagine:** creative scenario...
            > 
            > 🎯 **Goal:** what to understand...
            
            ### 💪 Practice Tips
            * 📝 Study strategy...
            * 🔄 Practice method...
            
            ### ❓ FAQ
            **Q:** Common question?
            **A:** Detailed answer...
            
            ***
            
            ## 🎓 Key Takeaways
            
            > 📌 **Remember These Points:**
            
            1. 🔸 First main concept
            2. 🔸 Second main concept
            
            """
        },
        {
            "role": "user",
            "content": content
        }
    ]
    
    
    payload = {
        "model": "llama3-groq-8b-8192-tool-use-preview",
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
            - Generate EXACTLY 4 questions
            - Questions should test understanding, not just memorization
            - Wrong answers should be plausible but clearly incorrect
            - Vary question difficulty
            - Focus on core concepts and practical applications
            - Keep language clear and unambiguous
            
            IMPORTANT: Return ONLY the JSON array with exactly 4 questions, no additional text or formatting."""
        },
        {
            "role": "user",
            "content": f"Generate quiz questions for this content:\n\n{content}"
        }
    ]
    
    payload = {
        "model": "llama3-groq-8b-8192-tool-use-preview",
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
        
        # Parse the response directly as a list
        questions = json.loads(response)
        if not isinstance(questions, list):
            print("Invalid response format - expected a list")
            return []
            
        # validate quiz format and limit number of questions
        validated_questions = []
        for question in questions[:5]:  # limit to first 5 questions
            print("\nValidating question:", question)
            if not all(key in question for key in ["question", "options", "correctAnswer"]):
                print("Missing required fields")
                continue
            if not isinstance(question["options"], list) or len(question["options"]) != 4:
                print("Wrong number of options")
                continue
            if not isinstance(question["correctAnswer"], int) or not 0 <= question["correctAnswer"] <= 3:
                print("Invalid correctAnswer")
                continue
            print("Question validated successfully")
            validated_questions.append(question)
        
        return validated_questions[:5]  # ensure we never return more than 5 questions
        
    except json.JSONDecodeError as e:
        print("\nJSON Parse Error:", str(e))
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