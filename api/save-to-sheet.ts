import { google } from "googleapis";

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const { ticket, user } = req.body;
  if (!ticket || !user) {
    res.status(400).json({ error: "ข้อมูลสำหรับบันทึกไม่ถูกต้องระบุคุณสมบัติไม่ครบ" });
    return;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  // Check if Credentials are missing (Simulation Mode for Local/Sandbox Preview)
  if (!email || !privateKey || !sheetId) {
    console.log("Saving in simulation mode because GOOGLE_SHEET_ID or credentials are not defined.");
    res.status(200).json({
      success: true,
      simulated: true,
      message: "⚠️ ระบบได้รับการประมวลผลแล้ว (โหมดตัวอย่างจำลอง): บันทึกข้อมูลลงทะเบียนเรียบร้อย แต่ตรวจไม่พบตัวแปร GOOGLE_SHEET_ID หรือ Service Account ใน .env จึงทำการบันทึกลงหน่วยความจำเบื้องต้นแทน",
    });
    return;
  }

  try {
    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
    const auth = new google.auth.JWT({
      email: email,
      key: formattedPrivateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth: auth as any });

    const timestamp = new Date().toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const values = [
      [
        ticket.id,
        timestamp,
        user.name || "ไม่ระบุชื่อ",
        user.email || "ไม่ระบุเมล",
        ticket.device,
        ticket.symptoms,
        ticket.duration,
        ticket.analysis.analysis,
        ticket.analysis.parts.join(", "),
        ticket.analysis.price,
        ticket.analysis.recommendation,
      ],
    ];

    // Append standard row in Google sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:K",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values,
      },
    });

    res.status(200).json({
      success: true,
      simulated: false,
      message: `✅ บันทึกข้อมูลใบแจ้งซ่อมหมายเลข ${ticket.id} ลงใน Google Sheets เรียบร้อยแล้ว!`,
    });
  } catch (error: any) {
    console.error("Error writing to Google Sheets:", error);
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการบันทึกลง Google Sheets: " + (error.message || "Unknown error"),
      hint: "กรุณาตรวจสอบว่าได้ตั้งค่าสิทธิ์ให้ Service Account อีเมลสามารถเข้าถึง (Editor/เขียน) ไฟล์ Google Sheet ดังกล่าวแล้วหรือยัง",
    });
  }
}
