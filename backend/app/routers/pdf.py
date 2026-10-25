
import json
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pypdf import PdfReader

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
METADATA_FILE = UPLOAD_DIR / "metadata.json"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024


def read_metadata():
    if not METADATA_FILE.exists():
        return []

    try:
        data = json.loads(METADATA_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def save_metadata(documents):
    METADATA_FILE.write_text(
        json.dumps(documents, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="PDF must be 10 MB or smaller.")

    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="The file does not appear to be a valid PDF.",
        )

    try:
        reader = PdfReader(BytesIO(content), strict=True)

        if reader.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail="Password-protected PDFs are not supported.",
            )

        extracted_text = "\n".join(
            page.extract_text() or "" for page in reader.pages
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read this PDF. Please try another file.",
        )

    stored_name = f"{uuid4().hex}.pdf"
    destination = UPLOAD_DIR / stored_name
    destination.write_bytes(content)

    document = {
        "stored_name": stored_name,
        "original_name": Path(file.filename).name,
        "pages": len(reader.pages),
        "text_characters": len(extracted_text),
        "size_bytes": len(content),
        "extracted_text": extracted_text,
    }

    documents = read_metadata()
    documents.insert(0, document)

    try:
        save_metadata(documents)
    except OSError:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="Could not save document metadata.",
        )

    return {
        "message": "PDF uploaded successfully.",
        "filename": document["original_name"],
        **document,
    }


@router.get("/")
def get_pdfs():
    documents = read_metadata()
    available_documents = []

    for document in documents:
        stored_name = document.get("stored_name", "")
        file_path = UPLOAD_DIR / stored_name

        if (
            stored_name
            and Path(stored_name).name == stored_name
            and file_path.is_file()
        ):
            available_documents.append({
                **document,
                "size_bytes": file_path.stat().st_size,
            })

    return {
        "count": len(available_documents),
        "files": available_documents,
    }


@router.get("/{stored_name}/text")
def get_pdf_text(stored_name: str):
    if (
        not stored_name.endswith(".pdf")
        or Path(stored_name).name != stored_name
    ):
        raise HTTPException(status_code=400, detail="Invalid document name.")

    documents = read_metadata()

    document = next(
        (
            item for item in documents
            if item.get("stored_name") == stored_name
        ),
        None,
    )

    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    return {
        "filename": document["original_name"],
        "pages": document["pages"],
        "text_characters": document["text_characters"],
        "extracted_text": document.get("extracted_text", ""),
    }
