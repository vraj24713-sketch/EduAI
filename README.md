# EduAI — AI-Powered Student Study Assistant

EduAI is a web application designed to help students manage study documents and access study tools from one dashboard.

## Features

- User registration and login
- JWT-based authentication
- PDF upload and document listing
- Text extraction from supported PDFs
- Document search
- PostgreSQL database integration
- Responsive React dashboard

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Database ORM | SQLAlchemy |
| Authentication | JWT, password hashing |
| PDF Processing | pypdf |
| API Documentation | FastAPI Swagger UI |
| Version Control | Git, GitHub |

## Project Structure

```text
EduAI/
├── backend/
│   └── app/
│       ├── core/
│       ├── database/
│       ├── models/
│       ├── routers/
│       ├── schemas/
│       └── services/
├── frontend/
│   └── src/
├── .gitignore
└── README.md
```

## Requirements

- Python
- Node.js and npm
- PostgreSQL
- Git

## Run the Backend

From the project root in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn app.main:app --reload
```

Backend: http://127.0.0.1:8000

API documentation: http://127.0.0.1:8000/docs

## Run the Frontend

Open a second terminal:

```powershell
cd C:\Projects\EduAI\frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

## Database Setup

Configure the database connection and JWT secret in the backend `.env` file. Keep credentials private and never commit environment files.

From the backend directory, initialize the database:

```powershell
python -m app.database.init_db
```

## Current Limitations

- The AI Study Assistant is not yet connected to an AI model.
- Scanned PDFs may not yield extractable text.
- Uploaded PDFs are stored locally in the backend.
- The current application is intended as a development and demonstration project.

## Future Improvements

- AI-powered summaries and question answering
- Asking questions about uploaded documents
- OCR for scanned PDFs
- Improved document previews
- Production deployment and additional testing

## GitHub Repository

https://github.com/vraj24713-sketch/EduAI

---

**Project:** EduAI  
**Purpose:** Student study assistance and PDF document management
