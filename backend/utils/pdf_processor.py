import PyPDF2
import io
from pathlib import Path
from .grok import process_pdf_content, query_grok

async def process_pdf(filename: str, content: bytes) -> tuple[str, list[str]]:
    # extract text from pdf
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
    text_content = ""
    
    # combine all text
    for page in pdf_reader.pages:
        text_content += page.extract_text()
    
    # split into 3 equal parts
    words = text_content.split()
    total_words = len(words)
    chunk_size = total_words // 3
    
    chunks = [
        " ".join(words[i:i + chunk_size]) 
        for i in range(0, total_words, chunk_size)
    ][:3]  # ensure exactly 3 chunks
    
    # get educational content for each chunk
    markdown_pages = []
    for chunk in chunks:
        page_content = await query_grok(chunk)
        markdown_pages.append(page_content)
    
    return filename, markdown_pages

async def process_pdfs(pdf_files: list[tuple[str, bytes]]) -> list[tuple[str, str]]:
    # process each pdf and collect results
    results = []
    for filename, content in pdf_files:
        result = await process_pdf(filename, content)
        results.append(result)
    return results 