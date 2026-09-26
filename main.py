from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from chatbot import chatbot_reply

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Product Hunting Chatbot")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list)


@app.get("/api/health")
def health():
    return {
        "status": "online",
        "message": "Product Hunting Chatbot is running!",
    }


@app.post("/chat")
def chat(request: ChatRequest):
    try:
        history = [msg.model_dump() for msg in request.history]
        reply = chatbot_reply(request.message.strip(), history)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="The assistant could not respond. Check your API key and try again.",
        )

    return {"reply": reply}


@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
