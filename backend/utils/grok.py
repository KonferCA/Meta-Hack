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
        "max_tokens": 4096
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

async def process_pdf_content(content: str) -> str:
    summary = await query_grok(content)
    return summary

async def query_grok_quiz(content: str) -> str:
    words = content.split()
    max_words = 100  # ~10 pages
    truncated_content = ' '.join(words[:max_words])
    
    messages = [
        {
            "role": "system",
            "content": """You are an expert quiz generator for educational content. 
            Generate multiple choice questions that test understanding of key concepts.
            
            IMPORTANT: Return your response as a SINGLE JSON array containing EXACTLY 4 questions. Example format:
            [
                {
                    "question": "What is the derivative of x^2?",
                    "options": ["x", "2x", "2", "x^2"],
                    "correctAnswer": 1
                },
                {
                    "question": "What is the integral of 2x dx?",
                    "options": ["x^2", "x^2 + C", "2x^2", "2x^2 + C"],
                    "correctAnswer": 2
                }
            ]

            Critical Rules:
            1. Generate ONLY ONE array with EXACTLY 4 questions
            2. DO NOT include any comments in the JSON
            3. correctAnswer must be 0, 1, 2, or 3 matching the index of the correct option
            4. Each question must have exactly 4 options
            5. Use proper JSON formatting without comments or trailing commas
            6. DO NOT add any text before or after the JSON array"""
        },
        {
            "role": "user",
            "content": f"Generate ONE array of 4 quiz questions for this content:\n\n{truncated_content}"
        }
    ]
    
    payload = {
        "model": "llama3-groq-70b-8192-tool-use-preview",
        "messages": messages,
        "temperature": 0.7,  # lower temperature for more consistent output
        "max_tokens": 4096   # reduced since quiz responses are shorter
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
                print("Raw quiz response:", response_content)
                
                try:
                    # Clean the response
                    cleaned_content = re.sub(r'\s*//.*$', '', response_content, flags=re.MULTILINE)
                    cleaned_content = re.sub(r',\s*([}\]])', r'\1', cleaned_content)
                    
                    # Parse JSON once
                    questions = json.loads(cleaned_content)
                    print(f"Parsed questions: {questions}")
                    
                    # Validate questions
                    if not isinstance(questions, list):
                        raise Exception("Response must be a list")
                        
                    cleaned_questions = []
                    for i, q in enumerate(questions[:4]):
                        print(f"Validating question {i + 1}")
                        if not all(key in q for key in ['question', 'options', 'correctAnswer']):
                            continue
                            
                        if not isinstance(q['options'], list):
                            continue
                            
                        # Truncate options to 4 if needed
                        if len(q['options']) > 4:
                            correct_option = q['options'][q['correctAnswer']]
                            q['options'] = q['options'][:4]
                            if correct_option not in q['options']:
                                q['options'][-1] = correct_option
                            q['correctAnswer'] = q['options'].index(correct_option)
                        elif len(q['options']) < 4:
                            continue
                            
                        if not isinstance(q['correctAnswer'], int) or q['correctAnswer'] not in range(4):
                            continue
                            
                        cleaned_questions.append(q)
                    
                    if not cleaned_questions:
                        raise Exception("No valid questions found")
                        
                    # Return the cleaned questions directly
                    return cleaned_questions[:4]
                    
                except json.JSONDecodeError as e:
                    print(f"Failed to parse quiz JSON: {e}")
                    print(f"Cleaned response: {cleaned_content}")
                    raise Exception("Failed to parse quiz response")
            else:
                error_text = await response.text()
                raise Exception(f"Failed to query GROK API: {error_text}")

async def generate_quiz(content: list[tuple[str, str]], progress_callback=None) -> list:
    try:
        if progress_callback:
            await anext(progress_callback({
                "type": "quiz",
                "status": "in_progress",
                "stats": {"step": "Generating quiz questions"}
            }))
            
        # take first 10 pages worth of content from each section
        quiz_content = ""
        for section_title, section_content in content:
            words = section_content.split()
            max_words = 5000  # ~10 pages
            truncated_section = ' '.join(words[:max_words])
            quiz_content += f"\n\n{section_title}:\n{truncated_section}"
            
        # questions is already a parsed list, no need to parse again
        questions = await query_grok_quiz(quiz_content)
        print("Raw quiz response:", questions)  # debug print
        
        if progress_callback:
            await anext(progress_callback({
                "type": "quiz",
                "status": "completed",
                "stats": {
                    "step": "Quiz generation complete",
                    "questionCount": len(questions),
                    "optionCount": sum(len(q['options']) for q in questions)
                }
            }))
            
        return questions
            
    except Exception as e:
        print(f"Failed to generate quiz: {e}")
        if progress_callback:
            await anext(progress_callback({
                "type": "quiz",
                "status": "error",
                "stats": {"error": str(e)}
            }))
        return []

async def generate_course_details(title: str, content: str) -> dict:
    try:
        prompt = f"""Analyze the course content and generate a detailed course description.
        Title: "{title}"

        Return a JSON object exactly in this format (note the escaped newlines and quotes):
        {{
            "description": "# Course Title\\n\\nFirst paragraph introducing the course...\\n\\nSecond paragraph about main topics...\\n\\nThird paragraph about outcomes...",
            "difficulty": "Beginner|Intermediate|Advanced",
            "estimated_hours": 20,
            "learning_outcomes": [
                "Specific outcome 1",
                "Specific outcome 2",
                "Specific outcome 3",
                "Specific outcome 4"
            ],
            "prerequisites": [
                "Prerequisite 1",
                "Prerequisite 2"
            ],
            "skills_gained": [
                "Specific skill 1",
                "Specific skill 2",
                "Specific skill 3",
                "Specific skill 4"
            ],
            "course_highlights": [
                "Main topic 1",
                "Main topic 2",
                "Main topic 3",
                "Main topic 4"
            ]
        }}

        Requirements:
        1. Use proper JSON formatting with escaped newlines (\\n) in description
        2. Use double quotes for all strings
        3. No trailing commas
        4. Description should be a single string with embedded newlines
        5. Arrays should contain 4-6 items each
        6. Make content specific to {title} and the provided material
        7. Do not include any markdown code blocks or json keywords
        """

        response = await query_grok(prompt)
        
        try:
            # remove any markdown code blocks or extra formatting
            cleaned_response = (response
                .replace('```json', '')
                .replace('```', '')
                .strip())
            
            course_details = json.loads(cleaned_response)
            return course_details
        except json.JSONDecodeError as e:
            print(f"Failed to parse course details JSON: {e}")
            print(f"Raw response: {response}")
            return generate_fallback_response(title, content)
            
    except Exception as e:
        print(f"Error generating course details: {e}")
        return generate_fallback_response(title, content)

def generate_fallback_response(title: str, content: str) -> dict:
    # create a more meaningful fallback using the title and content
    word_count = len(content.split())
    difficulty = "Advanced" if word_count > 5000 else "Intermediate" if word_count > 2000 else "Beginner"
    
    return {
        "description": f"""# {title}

This comprehensive course provides an in-depth exploration of {title}. Students will gain practical knowledge and hands-on experience in key concepts and methodologies.

Through structured lessons and practical exercises, participants will learn fundamental principles and advanced techniques. The course combines theoretical understanding with real-world applications.

By the end of this course, students will be equipped with practical skills and knowledge necessary for applying {title} concepts in professional settings.""",
        "difficulty": difficulty,
        "estimated_hours": min(40, max(10, word_count // 500)),  # scale with content
        "learning_outcomes": [
            f"Master fundamental concepts of {title}",
            "Apply theoretical knowledge to practical problems",
            "Develop analytical and problem-solving skills",
            "Gain hands-on experience with real-world applications"
        ],
        "prerequisites": [],
        "skills_gained": [
            "Technical proficiency",
            "Analytical thinking",
            "Problem solving",
            "Practical application"
        ],
        "course_highlights": [
            "Core concepts",
            "Practical applications",
            "Case studies"
        ]
    }