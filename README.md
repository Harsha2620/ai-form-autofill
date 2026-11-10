# AI Form Builder & Document Autofill

Build any form at runtime, upload a PDF or image, and let AI fill the form. Review, edit and save.

## Features
- Dynamic form builder: add/remove fields, custom labels, 6 field types, required toggle
- Live preview that updates as you build
- Upload PDF/PNG/JPG/JPEG with validation and clear error messages
- Schema-driven AI extraction (Gemini): works with whatever fields the user defines
- Confidence badges (high/medium/low), "Not found" flags, red highlight for empty required fields
- Review, edit and save with required-field validation

## Run locally
1. Install Node.js (LTS).
2. Get a free API key at https://aistudio.google.com
3. Server:
   cd server
   npm install
   Create server/.env containing: GEMINI_API_KEY=your_key
   node index.js
4. Client (new terminal):
   cd client
   npm install
   npm run dev
5. Open http://localhost:5173

## Tech and why
- React + Vite: fast, state-driven UI suits a runtime-built schema
- Node + Express + Multer: simple API for file upload
- Gemini API: reads PDFs and images directly, returns JSON

## How extraction works
The form schema (id, label, type, options) is sent with the file. The prompt tells the model to return JSON keyed by field id with a value and confidence, and to return null instead of guessing. Numbers are validated client-side; unfound values stay blank and are flagged.

## Assumptions and trade-offs
- Schema lives in React state; there is no database
- Saved form is shown as JSON on screen
- Gemini can return 503 under load, so the server retries and falls back across several models
- API key stays server-side in .env (git-ignored)

## Edge cases handled
Upload before building form, unsupported file type, corrupted file, missing required fields, non-numeric values, low-confidence values left blank.
