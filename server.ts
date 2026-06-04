import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import analyzeHandler from "./api/analyze";
import saveToSheetHandler from "./api/save-to-sheet";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API endpoint for diagnostic analysis - Delegated to Vercel Serverless Function handler
app.post("/api/analyze", async (req, res) => {
  try {
    await analyzeHandler(req, res);
  } catch (error: any) {
    console.error("Delegated API error:", error);
    res.status(500).json({ error: "Something went wrong in the serverless handler" });
  }
});

// API endpoint for Google Sheets saving - Delegated to Vercel Serverless Function handler
app.post("/api/save-to-sheet", async (req, res) => {
  try {
    await saveToSheetHandler(req, res);
  } catch (error: any) {
    console.error("Delegated Sheets API error:", error);
    res.status(500).json({ error: "Something went wrong in the serverless handler for Sheets" });
  }
});

// Configure Vite as middleware in development or static fallback in production
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is booted at http://0.0.0.0:${PORT}`);
});
