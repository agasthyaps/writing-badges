from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
import random
from prompts import PROMPT_LIBRARY
from llm_utils import Agent
import uvicorn
import json
import os

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://write.actually-useful.xyz"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WRITING_TYPES = [
    {
        "id": "poem",
        "prompt": "write a poem.",
        "description": "Use imagery and word choice to express yourself through poetry."
    },
    {
        "id": "story",
        "prompt": "tell a story.",
        "description": "Create a short narrative, fiction or non-fiction."
    },
    {
        "id": "description",
        "prompt": "describe a scene.",
        "description": "Use detailed observation to bring a moment or place to life."
    },
]

evaluator = Agent('gpt', PROMPT_LIBRARY['evaluator'], history=True, json_mode=True)
badge_creator = Agent('gpt', PROMPT_LIBRARY['badger'], json_mode=True)
hint_generator = Agent('4o', PROMPT_LIBRARY['hinter'])

class SubmissionRequest(BaseModel):
    submission: str
    badges: List[dict]
    writingType: dict

@app.get("/writing-type")
async def get_writing_type():
    writing_type = random.choice(WRITING_TYPES)
    return JSONResponse(content={"writingType": writing_type})

@app.get("/generate-badges")
async def generate_badges(writing_type_id: str):
    writing_type = next((wt for wt in WRITING_TYPES if wt["id"] == writing_type_id), WRITING_TYPES[0])
    
    # Update prompt to include writing type context
    prompt = f"""Generate badges for this writing task: {writing_type['prompt']} ({writing_type['description']})"""
    
    response = await badge_creator.respond_to(prompt)
    response = json.loads(response)
    
    badges = []
    for i in range(1, 4):
        badge_key = f"badge_{i}"
        badge_data = response[badge_key]
        badges.append({
            "id": f"badge_{i}",
            "name": badge_data["word"],
            "icon": badge_data["emoji"],
            "criteria": badge_data["criteria"],
            "clue": badge_data["clue"]  # Add this line to include the clue

        })
    return JSONResponse(content={"badges": badges})

@app.post("/evaluate")
async def evaluate(request: SubmissionRequest):
    criteria_text = "\n".join([
        f"Badge {i+1} ({badge['name']}): {badge['criteria']}" 
        for i, badge in enumerate(request.badges)
    ])
    
    prompt = f"""
    Writing Task: {request.writingType['prompt']} ({request.writingType['description']})
    
    Submission:
    {request.submission}
    
    Evaluate if this submission earns these badges:
    {criteria_text}
    """
    
    response = await evaluator.respond_to(prompt)
    response = json.loads(response)
    print(response)
    
    # Return the full response with scores
    return JSONResponse(content=response)

@app.post("/get-hint")
async def get_hint(request: SubmissionRequest):
    prompt = f"""
    Writing Task: {request.writingType['prompt']} ({request.writingType['description']})
    
    Current submission: {request.submission}
    Unearned badges: {', '.join([badge['name'] for badge in request.badges])}
    """
    response = await hint_generator.respond_to(prompt)
    return JSONResponse(content={"hint": response})

@app.get("/health")
async def health_check():
    return {"status": "ok", "env": os.environ.get('RAILWAY_ENVIRONMENT', 'local')}

if __name__ == '__main__':
    uvicorn.run(app, host="localhost", port=8000)