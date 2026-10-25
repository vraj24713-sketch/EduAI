
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "qwen2.5:3b"


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    context: str = Field(min_length=1, max_length=20000)
    document_name: str = "Study notes"


@router.get("/status")
async def ai_status():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(
                "http://127.0.0.1:11434/api/tags"
            )
            response.raise_for_status()
            data = response.json()

        models = [
            item.get("name", "")
            for item in data.get("models", [])
        ]

        available = any(
            name == MODEL or name.startswith(MODEL + ":")
            for name in models
        )

        return {
            "ollama_connected": True,
            "model": MODEL,
            "model_available": available,
        }

    except httpx.HTTPError:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Open the Ollama application.",
        )


@router.post("/chat")
async def chat(request: ChatRequest):
    question = request.question.strip()
    context = request.context.strip()

    if not question or not context:
        raise HTTPException(
            status_code=400,
            detail="Question and document text are required.",
        )

    payload = {
        "model": MODEL,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are EduAI, a helpful college study assistant. "
                    "Answer using the supplied document as your main "
                    "source. If the document does not contain the answer, "
                    "say so. Explain concepts simply and clearly."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Document: {request.document_name}\n\n"
                    f"Document text:\n{context}\n\n"
                    f"Student question: {question}"
                ),
            },
        ],
        "options": {
            "temperature": 0.3,
            "num_ctx": 8192,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            response = await client.post(
                OLLAMA_URL,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()

        answer = result.get("message", {}).get("content", "").strip()

        if not answer:
            raise HTTPException(
                status_code=502,
                detail="The AI returned an empty answer.",
            )

        return {
            "answer": answer,
            "model": MODEL,
            "document_name": request.document_name,
        }

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="The AI took too long. Try again with a shorter question.",
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not get an answer from Ollama.",
        ) from exc
