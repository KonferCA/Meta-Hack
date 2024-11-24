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
            "content": """You are a mathematics educator who creates engaging, visually appealing content.
            ALWAYS follow these styling rules:
            
            1. RICH MARKDOWN STRUCTURE:
            - Use standard dividers: ---
            - Add emojis for visual cues (📚 intro, 💡 concepts, 🔍 details)
            - Use > blockquotes for important insights
            - Use nested bullet points for clear hierarchy
            - Create tables for comparing concepts
            
            2. LATEX PRESENTATION:
            - Center important equations with $$ display mode $$
            - Use inline $...$ for mathematical terms
            - Add brief explanations after complex equations
            
            3. VISUAL HIERARCHY:
            - Use # for title
            - Use ## for main sections
            - Use ### for subsections
            - End with a clear summary"""
        },
        {
            "role": "user",
            "content": """Create an engaging educational page with this structure:

            # ✨ [Topic Title]

            ---

            ## 📚 Introduction
            > Key insight or motivation

            ## 💡 Key Concepts
            - **First Concept**: Explanation with $LaTeX$
              - Details with $equation$
              - Example application
            
            ### 🔍 Detailed Example
            > Important insight or rule
            
            $$ Main equation or concept $$

            ## 🌟 Applications
            | Context | Usage |
            |---------|--------|
            | Field 1 | Use 1  |

            ---

            📝 **Summary**: Key takeaways

            Content to convert:\n""" + content
        }
    ]
    
    payload = {
        "model": "llama3-groq-70b-8192-tool-use-preview",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 8192
    }
    
    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    while True:  # keep trying until successful
        async with aiohttp.ClientSession() as session:
            async with session.post(GROK_API_URL, headers=headers, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    print("Response from GROK API:")
                    print(data['choices'][0]['message']['content'])
                    return data['choices'][0]['message']['content']
                else:
                    error_text = await response.text()
                    # check if it's a rate limit error
                    if "rate_limit_exceeded" in error_text:
                        try:
                            # parse error json
                            error_data = json.loads(error_text)
                            # extract wait time using regex
                            wait_time_match = re.search(r'try again in (\d+\.?\d*)s', 
                                error_data['error']['message'])
                            if wait_time_match:
                                wait_time = float(wait_time_match.group(1))
                                print(f"Rate limit reached. Waiting {wait_time} seconds...")
                                await asyncio.sleep(wait_time + 0.5)  # add small buffer
                                continue  # retry after waiting
                        except (json.JSONDecodeError, KeyError, AttributeError):
                            pass
                    # if not a rate limit error or couldn't parse wait time
                    raise Exception(f"Failed to query GROK API: {error_text}")

async def process_pdf_content(pdf_content: str, filename: str) -> tuple[str, str]:
    summary = await query_grok(pdf_content)
    return filename, summary 