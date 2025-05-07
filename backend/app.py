from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from typing import List
import random
from prompts import PROMPT_LIBRARY
from llm_utils import Agent, remove_preamble
import uvicorn
import json
import os
from fastapi.staticfiles import StaticFiles
from uuid import uuid4
from PIL import Image, ImageDraw, ImageFont
import textwrap
from datetime import datetime
from pilmoji import Pilmoji
import threading
import time
from fastapi import APIRouter

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

evaluator = Agent('gpt41mini', PROMPT_LIBRARY['evaluator'], history=True, json_mode=True)
badge_creator = Agent('gemini', PROMPT_LIBRARY['badger'], json_mode=True)
hint_generator = Agent('gpt41nano', PROMPT_LIBRARY['hinter'])

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
    if response.startswith("```json"):
        response = remove_preamble(response)
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
    Unmet criteria: {', '.join([badge['name'] for badge in request.badges])}
    """
    response = await hint_generator.respond_to(prompt)
    return JSONResponse(content={"hint": response})

@app.get("/health")
async def health_check():
    return {"status": "ok", "env": os.environ.get('RAILWAY_ENVIRONMENT', 'local')}

# Mount static directory for generated share cards
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
CARDS_DIR = os.path.join(STATIC_DIR, "cards")
os.makedirs(CARDS_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Available background colors for share cards
AVAILABLE_BACKGROUND_COLORS = {
    "white": (255, 255, 255),
    "sky_blue": (210, 225, 245),
    "rose_pink": (245, 220, 225),
    "mint_leaf": (215, 240, 225),
}

# Helper to create a shareable PNG card

def _create_share_card(submission: str, badges: List[dict], writing_type: dict, attempts: int, background_color_name: str = "white") -> str:
    WIDTH, HEIGHT = 1080, 1080
    MARGIN_X, MARGIN_Y = 80, 100
    
    chosen_bg_rgb = AVAILABLE_BACKGROUND_COLORS.get(background_color_name.lower(), AVAILABLE_BACKGROUND_COLORS["white"])

    DARK_TEXT_COLOR = (30, 30, 30)
    MEDIUM_TEXT_COLOR = (50, 50, 50)
    BRAND_TEXT_COLOR = (150, 150, 150)
    EMOJI_FONT_COLOR = (30, 30, 30)
    EMOJI_FONT_SIZE = 54
    TEXTURE_OPACITY_FACTOR = 1

    # 1. Create base image with chosen background color, start as RGBA for compositing
    base = Image.new("RGBA", (WIDTH, HEIGHT), chosen_bg_rgb + (255,))

    # 2. Try loading, tiling, and applying the paper texture with opacity
    texture_path = os.path.join(os.path.dirname(__file__), "assets", "paper_texture.png")
    if os.path.exists(texture_path):
        try:
            tex_opened = Image.open(texture_path)
            tex = tex_opened.convert("RGBA")
            tiled_texture_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
            for y_offset in range(0, HEIGHT, tex.height):
                for x_offset in range(0, WIDTH, tex.width):
                    tiled_texture_layer.paste(tex, (x_offset, y_offset))
            if TEXTURE_OPACITY_FACTOR < 1.0:
                alpha = tiled_texture_layer.split()[-1]
                alpha = alpha.point(lambda i: int(i * TEXTURE_OPACITY_FACTOR))
                tiled_texture_layer.putalpha(alpha)
            base.alpha_composite(tiled_texture_layer)
        except Exception as e:
            print(f"[WARN] Failed to load or apply texture '{texture_path}': {e}. Check image mode and integrity.")
    else:
        print(f"[INFO] Texture not found at {texture_path}, using plain off-white background.")

    draw = ImageDraw.Draw(base)

    # 3. Load fonts
    body_font_path = os.path.join(os.path.dirname(__file__), "assets", "CourierPrime-Regular.ttf")
    title_font_path_bold = os.path.join(os.path.dirname(__file__), "assets", "CourierPrime-Bold.ttf")
    emoji_font_path_local = os.path.join(os.path.dirname(__file__), "assets", "NotoColorEmoji-Regular.ttf")
    title_font_size = 80
    submission_font_size = 40
    attempts_font_size = 30
    brand_font_size = 28

    # Title font
    try:
        title_font = ImageFont.truetype(title_font_path_bold, title_font_size)
    except IOError:
        try:
            title_font = ImageFont.truetype(body_font_path, title_font_size)
        except IOError:
            title_font = ImageFont.load_default().font_variant(size=title_font_size)
    # Submission font
    try:
        submission_font = ImageFont.truetype(body_font_path, submission_font_size)
        attempts_font = ImageFont.truetype(body_font_path, attempts_font_size)
        brand_font_main = ImageFont.truetype(body_font_path, brand_font_size)
    except IOError:
        submission_font = ImageFont.load_default().font_variant(size=submission_font_size)
        attempts_font = ImageFont.load_default().font_variant(size=attempts_font_size)
        brand_font_main = ImageFont.load_default().font_variant(size=brand_font_size)
    # Emoji font (for sizing, but Pilmoji will handle emoji rendering)
    try:
        emoji_font = ImageFont.truetype(emoji_font_path_local, EMOJI_FONT_SIZE)
    except IOError:
        try:
            emoji_font = ImageFont.truetype("NotoColorEmoji-Regular.ttf", EMOJI_FONT_SIZE)
        except IOError:
            emoji_font = ImageFont.load_default().font_variant(size=EMOJI_FONT_SIZE)

    # 4. Title: [emojis]
    emoji_str = "  ".join([b.get("icon", "?") for b in badges])
    title_text = f"{emoji_str}"
    # Use Pilmoji for title
    with Pilmoji(base) as pilmoji:
        title_bbox = pilmoji.getsize(title_text, font=title_font)
    title_width = title_bbox[0]
    title_actual_height = title_bbox[1]
    title_x_position = int((WIDTH - title_width) / 2)
    title_y_position = MARGIN_Y + 30
    with Pilmoji(base) as pilmoji:
        pilmoji.text((title_x_position, title_y_position), title_text, fill=DARK_TEXT_COLOR, font=title_font)

    # 5. Prepare Submission Text (centered horizontally and vertically)
    # Split by newlines first, then wrap each line
    submission_lines = submission.split('\n')
    wrapped_lines = []
    for line in submission_lines:
        wrapped_lines.extend(textwrap.wrap(line, width=30))
    
    submission_line_height = submission_font.getbbox("A")[3] - submission_font.getbbox("A")[1] + 10
    total_submission_height = len(wrapped_lines) * submission_line_height
    attempts_text = f"" # remove for now
    attempts_text_height = attempts_font.getbbox(attempts_text)[3] - attempts_font.getbbox(attempts_text)[1]
    gap_submission_attempts = 30
    text_block_height = total_submission_height + gap_submission_attempts + attempts_text_height
    available_height = HEIGHT - (title_y_position + title_actual_height + 40) - MARGIN_Y
    start_y_text_block = title_y_position + title_actual_height + 40 + int((available_height - text_block_height) / 2)
    current_y = start_y_text_block
    # Draw submission lines with Pilmoji
    with Pilmoji(base) as pilmoji:
        for line in wrapped_lines:
            line_bbox = pilmoji.getsize(line, font=submission_font)
            line_width = line_bbox[0]
            start_x_line = int((WIDTH - line_width) / 2)
            pilmoji.text((start_x_line, current_y), line, fill=DARK_TEXT_COLOR, font=submission_font)
            current_y += submission_line_height
    current_y += gap_submission_attempts
    # Draw attempts text (blank for now)
    if attempts_text:
        with Pilmoji(base) as pilmoji:
            attempts_bbox = pilmoji.getsize(attempts_text, font=attempts_font)
            attempts_width = attempts_bbox[0]
            start_x_attempts = int((WIDTH - attempts_width) / 2)
            pilmoji.text((start_x_attempts, current_y), attempts_text, font=attempts_font, fill=MEDIUM_TEXT_COLOR)

    # 6. Draw Branding (bottom center, where emojis were)
    brand_text = "write.actually-useful.xyz"
    with Pilmoji(base) as pilmoji:
        brand_bbox = pilmoji.getsize(brand_text, font=brand_font_main)
    brand_width = brand_bbox[0]
    brand_height = brand_bbox[1]
    brand_x = int((WIDTH - brand_width) / 2)
    brand_y = HEIGHT - brand_height - MARGIN_Y - 60
    with Pilmoji(base) as pilmoji:
        pilmoji.text((brand_x, brand_y), brand_text, font=brand_font_main, fill=BRAND_TEXT_COLOR)

    # 7. Convert final image to RGB before saving if it was RGBA
    if base.mode == 'RGBA':
        final_image = Image.new("RGB", base.size, chosen_bg_rgb)
        final_image.paste(base, (0,0), base)
        base = final_image

    filename = f"{uuid4().hex}.png"
    filepath = os.path.join(CARDS_DIR, filename)
    base.save(filepath, format="PNG")
    print(f"[INFO] Saved share card to {filepath}")
    return f"/static/cards/{filename}"

class ShareRequest(BaseModel):
    submission: str
    badges: List[dict]
    writingType: dict
    attempts: int
    backgroundColor: str = "white" # Added field with default

@app.post("/share-image")
async def share_image(req: ShareRequest):
    try:
        # Randomly select a background color
        random_color = random.choice(list(AVAILABLE_BACKGROUND_COLORS.keys()))
        url_path = _create_share_card(
            req.submission, 
            req.badges, 
            req.writingType, 
            req.attempts,
            random_color  # Use randomly selected color
        )
    except Exception as e:
        print(f"Share image generation failed: {e}") # Improved logging
        url_path = None

    # Fallback text block
    badge_icons = " ".join([b.get("icon", "?") for b in req.badges])
    fallback = (
        f"I wrote something in {req.attempts} attempts!\n"
        f"Prompt: {req.writingType.get('prompt', '')}\n\n"
        f"--- My piece ---\n{req.submission}\n\n"
        f"{badge_icons}\nhttps://write.actually-useful.xyz"
    )
    return {"url": url_path, "fallback": fallback}

# Quick test endpoint with sample payload
@app.get("/test-share")
async def test_share():
    sample_submission = "Golden dusk leaked through boarded windows\n painting dust motes like drifting stars.\nand the wind whispered\n secrets of the past."
    sample_badges = [
        {"icon": "🌈", "name": "Metaphor"},
        {"icon": "🍊", "name": "Tangerine"},
        {"icon": "🔊", "name": "Sound"},
    ]
    sample_wt = {"prompt": "describe a scene."}
    url_path = _create_share_card(sample_submission, sample_badges, sample_wt, 4, background_color_name="mint_leaf") # Test with a color
    return {"url": url_path}

# --- MVP: Periodic cleanup of cards older than 2 hours ---
CLEANUP_INTERVAL_SECONDS = 60 * 60  # Check every hour
CARD_EXPIRY_SECONDS = 2 * 60 * 60   # 2 hours

def cleanup_old_cards():
    while True:
        now = time.time()
        for fname in os.listdir(CARDS_DIR):
            fpath = os.path.join(CARDS_DIR, fname)
            try:
                if os.path.isfile(fpath):
                    mtime = os.path.getmtime(fpath)
                    if now - mtime > CARD_EXPIRY_SECONDS:
                        os.remove(fpath)
                        print(f"[CLEANUP] Deleted expired card: {fname}")
            except Exception as e:
                print(f"[CLEANUP] Error deleting {fname}: {e}")
        time.sleep(CLEANUP_INTERVAL_SECONDS)

# Start cleanup thread on app startup
threading.Thread(target=cleanup_old_cards, daemon=True).start()

# --- Custom static file route for cards: redirect home if missing ---
router = APIRouter()

@router.get("/static/cards/{filename}")
async def serve_card_image(filename: str):
    fpath = os.path.join(CARDS_DIR, filename)
    if not os.path.isfile(fpath):
        return RedirectResponse(url="/")
    return RedirectResponse(url=f"/static/cards/{filename}", status_code=307)

app.include_router(router)

if __name__ == '__main__':
    uvicorn.run(app, host="localhost", port=8000)