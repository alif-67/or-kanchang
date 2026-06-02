import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize GoogleGenAI client on the server
// Set User-Agent to 'aistudio-build' in httpOptions for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.use(express.json());

// API endpoint for diagnostic analysis
app.post("/api/analyze", async (req, res) => {
  try {
    const { device, symptoms, duration } = req.body;
    if (!device || !symptoms || !duration) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const systemPrompt = `คุณคือหนึ่งใน AI ทีมวิศวกรซ่อมบำรุงและช่างผู้เชี่ยวชาญจาก "อ.การช่าง"
วิเคราะห์รายละเอียดอาการเสียของอุปกรณ์ รถจักรยานยนต์ เครื่องยนต์ ของใช้ หรือเครื่องจักรต่างๆ ที่ผู้ใช้งานส่งมา
คุณต้องค้นหาและคาดการณ์สาเหตุอย่างมืออาชีพ แม่นยำ และสุภาพสุดๆ
กรุณาตอบเป็น JSON ภาษาไทยเสมอ ด้วยฟิลด์รายละเอียดตามกติกาโครงสร้างที่กำหนด`;

    const userPrompt = `ต้องการให้วิเคราะห์อาการของอุปกรณ์ดังนี้:
- ชนิดอุปกรณ์/รุ่น: ${device}
- รายละเอียดอาการเสีย: ${symptoms}
- ระยะเวลาที่พบบัญหา: ${duration}

กรุณาวิเคราะห์และตอบกลับในรูปแบบ JSON ที่มีแป้นพิมพ์คีย์:
{
  "analysis": "บทวิเคราะห์วิเคราะห์สาเหตุที่เป็นไปได้อย่างละเอียดและเข้าใจง่าย",
  "parts": ["ชื่อชิ้นส่วนอะไหล่ที่ 1 คาดว่าจะแต่อะเสียหรือต้องทำการเปลี่ยน", "ชื่อชิ้นส่วนอะไหล่ที่ 2", ...],
  "price": "กรอบหรือช่วงราคาประเมินค่าซ่อมและอะไหล่ (เช่น 250 - 600 บาท)",
  "recommendation": "คำแนะนำสเต็ปถัดไปในการรับมือหรือการดูแลรักษาประคองเบื้องต้น"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["analysis", "parts", "price", "recommendation"],
          properties: {
            analysis: {
              type: Type.STRING,
              description: "บทวิเคราะห์เจาะลึกชี้ขาดปัญหาและสาเหตุหลักที่อาจเกิดขึ้น",
            },
            parts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "รายการชิ้นส่วนที่ควรเปลี่ยนหรือตรวจเช็คอย่างเร่งด่วนที่สุด",
            },
            price: {
              type: Type.STRING,
              description: "ช่วงงบประมาณประเมินโดยประมาณ หน่วยบาทไทยพร้อมระบุชัดเจน",
            },
            recommendation: {
              type: Type.STRING,
              description: "ข้อควรระวังหรือแนวปฏิบัติทางวิศวกรรมที่ผู้ใช้ควรทำก่อนส่งร้านช่างจริง",
            },
          },
        },
      },
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("ไม่มีข้อมูลส่งกลับจากระบบวิเคราะห์ AI");
    }

    const parsedJson = JSON.parse(textResult.trim());
    return res.json(parsedJson);
  } catch (error: any) {
    console.error("AI Estimation Error:", error);
    return res.status(500).json({
      error: "เกิดข้อผิดพลาดในการติดต่อระบบวิเคราะห์ AI: " + (error.message || "Unknown error"),
    });
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
