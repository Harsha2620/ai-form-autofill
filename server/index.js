require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];

app.post("/extract", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    if (!ALLOWED.includes(req.file.mimetype))
      return res.status(400).json({ error: "Unsupported file type. Please upload a PDF, PNG, JPG or JPEG." });

    const fields = JSON.parse(req.body.fields || "[]");
    if (!fields.length)
      return res.status(400).json({ error: "Build the form first." });

    const schemaText = fields
      .map((f) => `- id: ${f.id} | label: "${f.label}" | type: ${f.type}` +
        (f.type === "dropdown" ? ` | options: ${JSON.stringify(f.options)}` : ""))
      .join("\n");

    const prompt = `You extract data from a document to fill a form.
Fields:
${schemaText}

Rules:
- Return ONLY valid JSON, no markdown.
- Keys are the field ids. Each value is {"value": ..., "confidence": "high"|"medium"|"low"}.
- If a value is not clearly present in the document, use {"value": null, "confidence": null}. Never guess.
- number fields: a number only. date fields: YYYY-MM-DD. checkbox: true or false.
- For number fields: never return 0 unless the document explicitly states 0. If unsure, return null.';
- dropdown: return exactly one of the given options, otherwise null.`;

    const MODELS = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"];
let result = null;
let lastErr = null;

for (const name of MODELS) {
  for (let attempt = 0; attempt < 3 && !result; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: name,
        generationConfig: { responseMimeType: "application/json" },
      });
      result = await model.generateContent([
        { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } },
        prompt,
      ]);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  if (result) break;
}

if (!result) throw lastErr;
res.json(JSON.parse(result.response.text()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extraction failed: " + (err.message || "unknown error") });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));