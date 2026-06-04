import { useState, useEffect, FormEvent, MouseEvent } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { 
  Wrench, 
  Cpu, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  History, 
  Plus, 
  Loader2, 
  Sparkles, 
  Printer, 
  ArrowRight,
  ClipboardList,
  Trash2,
  FileCheck,
  LogOut,
  User,
  ExternalLink,
  Shield,
  Layers,
  Database
} from "lucide-react";

interface RepairAnalysis {
  analysis: string;
  parts: string[];
  price: string;
  recommendation: string;
}

interface RepairTicket {
  id: string;
  device: string;
  symptoms: string;
  duration: string;
  timestamp: string;
  analysis: RepairAnalysis;
  status: "pending_review" | "approved" | "completed";
}

interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  sub: string;
  isDemo?: boolean;
}

// Read Google client ID from environment dynamically
const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "";

// Simple JWT parser for decoding the Google returned ID token credential
const parseJwt = (token: string): any => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    console.error("JWT decoding failed:", e);
    return {};
  }
};

export default function App() {
  // If the client ID is not configured (e.g. initial load), we still wrap it to avoid GoogleOAuthProvider errors
  const activeClientId = GOOGLE_CLIENT_ID || "mock-dummy-client-id.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={activeClientId}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}

function AppContent() {
  // Authentication coordinates
  const [user, setUser] = useState<GoogleUser | null>(null);

  // Form coordinates
  const [device, setDevice] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("เพิ่งเป็น");

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active result state
  const [activeAnalysis, setActiveAnalysis] = useState<RepairAnalysis | null>(null);

  // Sheets saving status coordinations
  const [sheetSaving, setSheetSaving] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<{
    text: string;
    type: "success" | "error" | "warn";
  } | null>(null);

  // Local storage history of tickets
  const [tickets, setTickets] = useState<RepairTicket[]>([]);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected historic ticket
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Show developer/configuration help card
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  // Check persisted login session and tickets and mount
  useEffect(() => {
    // 1. Persisted User Session
    const savedUser = localStorage.getItem("or_kar_chang_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to load saved user session", e);
      }
    }

    // 2. Persisted Repair Tickets Logs
    const savedTickets = localStorage.getItem("or_kar_chang_tickets");
    if (savedTickets) {
      try {
        setTickets(JSON.parse(savedTickets));
      } catch (e) {
        console.error("Failed to load saved tickets", e);
      }
    }
  }, []);

  // Show auto-dismissing toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Google Sign In handler
  const handleGoogleSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      const decoded = parseJwt(credentialResponse.credential);
      const userProfile: GoogleUser = {
        name: decoded.name || decoded.email.split("@")[0],
        email: decoded.email,
        picture: decoded.picture || "",
        sub: decoded.sub,
        isDemo: false,
      };
      setUser(userProfile);
      localStorage.setItem("or_kar_chang_user", JSON.stringify(userProfile));
      showToast(`ยินดีต้อนรับคุณ ${userProfile.name} เข้าสู่ระบบสำเร็จ! 🎉`);
    }
  };

  const handleDemoSignIn = () => {
    const demoProfile: GoogleUser = {
      name: "ช่างฝึกหัด (บัญชีทดลอง)",
      email: "demo.mechanic@okarchang.io",
      picture: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150",
      sub: "demo-google-sub-id",
      isDemo: true,
    };
    setUser(demoProfile);
    localStorage.setItem("or_kar_chang_user", JSON.stringify(demoProfile));
    showToast("🔓 เข้าสู่ระบบในฐานะ บัญชีทดลองสำเร็จ (เชื่อม Google Sheets ในโหมดจำลอง)");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("or_kar_chang_user");
    showToast("ออกจากระบบเรียบร้อยแล้ว");
  };

  // Trigger analysis call to proxy server
  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("กรุณาเข้าสู่ระบบด้วย Google หรือบัญชีทดสอบด้านบนก่อนกดปุ่มวิเคราะห์");
      return;
    }

    if (!device.trim()) {
      setError("กรุณาระบุชื่ออุปกรณ์/รุ่นก่อนเริ่มการวิเคราะห์");
      return;
    }
    if (!symptoms.trim()) {
      setError("กรุณากรอกรายละเอียดอาการเสียที่พบ");
      return;
    }

    setLoading(true);
    setError(null);
    setSheetMessage(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device: device.trim(),
          symptoms: symptoms.trim(),
          duration: duration,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "ไม่สามารถติดต่อเครื่องวิเคราะห์อาการ AI ได้");
      }

      const result: RepairAnalysis = await response.json();
      setActiveAnalysis(result);
      showToast("✨ วิเคราะห์ข้อมูลสำเร็จและเสร็จสิ้นการประเมินแล้ว!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // Save the result into our system & Google Sheets
  const handleSaveTicket = async () => {
    if (!activeAnalysis) return;
    if (!user) {
      showToast("กรุณาเข้าสู่ระบบก่อนทำการบันทึกประวัติ");
      return;
    }

    setSheetSaving(true);
    setSheetMessage(null);

    // Create ticket object
    const newTicket: RepairTicket = {
      id: "TK-" + Math.floor(100000 + Math.random() * 900000),
      device: device.trim(),
      symptoms: symptoms.trim(),
      duration: duration,
      timestamp: new Date().toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      analysis: activeAnalysis,
      status: "pending_review",
    };

    // 1. Sync React local states history first
    const updated = [newTicket, ...tickets];
    setTickets(updated);
    localStorage.setItem("or_kar_chang_tickets", JSON.stringify(updated));
    setSelectedTicketId(newTicket.id);

    try {
      // 2. Invoke our Sheet integration API
      const res = await fetch("/api/save-to-sheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket: newTicket,
          user: {
            name: user.name,
            email: user.email,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.simulated) {
          setSheetMessage({
            text: data.message,
            type: "warn",
          });
          showToast("⚠️ บันทึกตั๋วแล้ว (โหมดจำลอง)");
        } else {
          setSheetMessage({
            text: data.message,
            type: "success",
          });
          showToast("🚀 บันทึกประวัติซ่อมลง Google Sheets สำเร็จ!");
        }
      } else {
        setSheetMessage({
          text: data.error || "เกิดข้อผิดพลาดในการเชื่อมโยงกับฐานข้อมูลแผ่นตาราง Google Sheets",
          type: "error",
        });
        showToast("❌ เกิดข้อผิดพลาดในการอัปโหลด Sheets");
      }
    } catch (err: any) {
      console.error(err);
      setSheetMessage({
        text: "ไม่สามารถส่งข้อมูลไปบันทึกยัง Google Sheets ได้ในขณะนี้ ตรวจสอบเครือข่ายอินเทอร์เน็ต",
        type: "error",
      });
      showToast("❌ การบันทึกข้อมูลล้มเหลว");
    } finally {
      setSheetSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Clear a ticket from history
  const handleDeleteTicket = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const updated = tickets.filter(t => t.id !== id);
    setTickets(updated);
    localStorage.setItem("or_kar_chang_tickets", JSON.stringify(updated));
    if (selectedTicketId === id) {
      setSelectedTicketId(null);
    }
    showToast("ลบประวัติคำขอแจ้งซ่อมเรียบร้อยแล้ว");
  };

  // Select historic ticket to view
  const handleSelectTicket = (ticket: RepairTicket) => {
    setSelectedTicketId(ticket.id);
    setDevice(ticket.device);
    setSymptoms(ticket.symptoms);
    setDuration(ticket.duration);
    setActiveAnalysis(ticket.analysis);
    setSheetMessage(null);
  };

  // Reset form to write brand new one
  const handleNewAnalysis = () => {
    setDevice("");
    setSymptoms("");
    setDuration("เพิ่งเป็น");
    setActiveAnalysis(null);
    setSelectedTicketId(null);
    setError(null);
    setSheetMessage(null);
  };

  return (
    <div id="ai-estimate-root" className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 transition-all duration-300">
      
      {/* Absolute Toast Notification */}
      {toastMessage && (
        <div id="toast-notif" className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-[#0f172a] text-white px-5 py-4 rounded-xl shadow-2xl border border-gray-800 animate-slide-in max-w-sm pointer-events-auto">
          <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <header id="main-header" className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#e2e8f0] px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleNewAnalysis}>
            <div className="w-10 h-10 bg-[#2563eb] rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 transition-transform hover:scale-105">
              <Wrench className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-[#0f172a]">อ.การช่าง</span>
                <span className="text-[10px] bg-blue-50 text-[#2563eb] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">AI DIAGNOSTIC</span>
              </div>
              <p className="text-[11px] text-[#64748b] hidden sm:block font-medium">ระบบวิเคราะห์อาการและเขียนใบประเมินราคางานวิศวกรรม</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            {/* User Profile display or CTA login indicator */}
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-1.5 pr-3.5 transition-all">
                {user.picture ? (
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-lg object-cover ring-2 ring-blue-500/15"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="text-left leading-none">
                  <span className="text-xs font-bold text-gray-800 block truncate max-w-[120px]">
                    {user.name}
                  </span>
                  <span className="text-[9px] text-[#2563eb] font-bold block mt-0.5 uppercase tracking-wider">
                    {user.isDemo ? "บัญชีทดสอบ" : "บัญชี Google"}
                  </span>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="ml-2 p-1.5 text-[#94a3b8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-[11px] font-bold text-[#c53030] bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg">
                ⚠️ กรุณาเข้าสู่ระบบด้านล่างก่อนเรียกใช้งาน AI
              </div>
            )}

            <div className="h-8 w-[1px] bg-[#e2e8f0] hidden sm:block"></div>

            <button 
              onClick={() => setShowConfigHelp(!showConfigHelp)}
              className="px-3 py-1.5 text-xs text-[#475569] font-bold hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1 border border-transparent hover:border-slate-200"
            >
              <Database className="w-3.5 h-3.5" />
              วิธีเชื่อมต่อ Sheets
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Input form & Historic Lists */}
        <section className="lg:col-span-5 space-y-6">
          
          {/* Main Assessment Form Card with custom Login Blockade Overlay */}
          <div id="repair-form-card" className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-[#e2e8f0] p-6 lg:p-8 relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#2563eb]"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base lg:text-lg font-bold text-[#0f172a] flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#2563eb]" />
                รายละเอียดแจ้งซ่อมอาการเสีย
              </h2>
              {selectedTicketId && (
                <span className="text-[11px] bg-blue-50 text-[#2563eb] px-2.5 py-1 rounded-lg font-extrabold">
                  ดูประวัติ: {selectedTicketId}
                </span>
              )}
            </div>

            {/* Glassmorphic Auth Lock Shield if not logged in */}
            {!user && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center text-white">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 mb-4 animate-pulse">
                  <Shield className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-lg font-extrabold tracking-tight mb-2">กรุณาเข้าสู่ระบบ "อ.การช่าง AI"ก่อนซ่อม</h3>
                <p className="text-xs text-slate-300 max-w-xs leading-relaxed mb-6">
                  จำเป็นต้องระบุชื่อผู้ส่งและเก็บบันทึกประวิติ และจัดเตรียมข้อมูลเชื่อมโยงหน้าแผ่น Google Sheets ได้อย่างโปร่งใส
                </p>

                {/* React-OAuth-Google Button */}
                <div id="google-login-holder" className="bg-white rounded-xl p-1 shadow-2xl inline-block max-w-[280px]">
                  {GOOGLE_CLIENT_ID ? (
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => showToast("การเชื่อมเข้าสู่ระบบผิดพลาด กรุณาลองอีกครั้ง")}
                      text="signin_with"
                      shape="pill"
                      theme="outline"
                    />
                  ) : (
                    <div className="p-3 text-left">
                      <span className="text-[10px] text-red-600 font-extrabold block mb-1">
                        ⚠️ ตรวจไม่พบ VITE_GOOGLE_CLIENT_ID
                      </span>
                      <span className="text-[9px] text-[#4a5568] block">
                        กรุณาใส่อีเมล/คีย์ใน .env เพื่อใช้ Google Login จริง
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 my-4 w-full max-w-xs">
                  <div className="h-[1px] bg-slate-600 flex-1"></div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">หรือ</span>
                  <div className="h-[1px] bg-slate-600 flex-1"></div>
                </div>

                {/* Instant Guest Demo Login option */}
                <button
                  type="button"
                  onClick={handleDemoSignIn}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 hover:shadow-lg transition-all rounded-xl font-bold text-xs text-white uppercase shadow-md flex items-center gap-2 ring-2 ring-blue-400/20 active:scale-95"
                >
                  <User className="w-3.5 h-3.5" />
                  เข้าใช้ด่วนในฐานะผู้ทดสอบ (Demo)
                </button>
              </div>
            )}

            <form onSubmit={handleAnalyze} className="space-y-5">
              
              {/* Device Input */}
              <div>
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">
                  ชื่ออุปกรณ์ / รุ่นรถ / เครื่องจักร
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={device}
                    onChange={(e) => setDevice(e.target.value)}
                    placeholder="เช่น Honda Wave 110i, โทรทัศน์ Samsung 55 นิ้ว"
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] transition-all text-[#334155] placeholder:text-[#94a3b8] text-sm"
                    disabled={loading}
                    required
                  />
                </div>
                <p className="text-[11px] text-[#94a3b8] mt-1.5">
                  ระบุแบรนด์หรือรุ่นโดยละเอียด จะช่วยประเมินราคาอะไหล่ได้คุ้มค่าและแม่นยำยิ่งขึ้น
                </p>
              </div>

              {/* Symptoms Input */}
              <div>
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">
                  รายละเอียดอาการเสียที่พบ
                </label>
                <textarea 
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="เช่น มีเสียงดังครืดคราวด้านท้ายตอนเบรก, ควันขาวออกเมื่อสตาร์ทเช้าๆ, หรือระบบไฟจ่ายกระแสไฟไม่สม่ำเสมอ"
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] transition-all h-28 resize-none text-[#334155] placeholder:text-[#94a3b8] text-sm leading-relaxed"
                  disabled={loading}
                  required
                ></textarea>
              </div>

              {/* Duration select */}
              <div>
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
                  ระยะเวลาที่เริ่มมีอาการ
                </label>
                <div className="relative">
                  <select 
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl appearance-none text-[#334155] text-sm cursor-pointer focus:ring-2 focus:ring-[#2563eb] focus:outline-none"
                    disabled={loading}
                  >
                    <option value="เพิ่งเป็น">เพิ่งเป็นเป็นวันนี้ / สดๆร้อนๆ</option>
                    <option value="1-3 วัน">1 - 3 วันที่แล้ว</option>
                    <option value="มากกว่า 1 สัปดาห์">มากกว่า 1 สัปดาห์เป็นต้นไป</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Error warning inside form */}
              {error && (
                <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-xl border border-red-100 flex items-start gap-2 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {selectedTicketId && (
                  <button
                    type="button"
                    onClick={handleNewAnalysis}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 border border-[#e2e8f0]"
                  >
                    เขียนตั๋วใหม่
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={loading}
                  className={`flex-[2] py-3 bg-[#2563eb] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all ${
                    loading ? "opacity-75 cursor-not-allowed scale-[0.99]" : "hover:bg-[#1d4ed8] hover:shadow-xl hover:shadow-blue-200 active:scale-[0.98]"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังประมวลผลอาการเสียด้วยช่าง AI...
                    </>
                  ) : (
                    <>
                      <Cpu className="w-4 h-4" />
                      วิเคราะห์อาการเสียด้วย AI
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* History / Recent tickets */}
          <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] border border-[#e2e8f0] p-6 lg:p-7">
            <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-[#64748b]" />
              ประวัติวิเคราะห์ & ตั๋วสิทธิ์ล่าสุด ({tickets.length})
            </h3>

            {tickets.length === 0 ? (
              <div className="text-center py-8 text-[#94a3b8] border-2 border-dashed border-[#e2e8f0] rounded-xl">
                <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50 stroke-[1.5]" />
                <p className="text-xs font-bold">ไม่มีรายการบันทึกประวัติ</p>
                <p className="text-[10px] mt-0.5 max-w-[260px] mx-auto text-[#94a3b8] leading-relaxed">หลังจาก AI รายงานแล้ว คลิกปุ่ม "บันทึกลงระบบ" เพื่อแสดงในตารางและส่งประวัติลงชีต</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
                {tickets.map((t) => {
                  const isActive = selectedTicketId === t.id;
                  return (
                    <div 
                      key={t.id}
                      onClick={() => handleSelectTicket(t)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isActive 
                          ? "bg-blue-50/75 border-[#2563eb]/40 shadow-sm" 
                          : "bg-[#f8fafc] border-[#e2e8f0] hover:border-gray-300"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[#2563eb]">{t.id}</span>
                          <span className="text-[9px] text-[#94a3b8]">{t.timestamp}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 truncate">{t.device}</h4>
                        <p className="text-[11px] text-[#64748b] truncate mt-0.5">{t.symptoms}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-extrabold text-blue-600 shrink-0">{t.analysis.price}</span>
                        <button
                          onClick={(e) => handleDeleteTicket(t.id, e)}
                          className="p-1 px-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                          title="ลบคำขอ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </section>

        {/* Right Side: AI Diagnostic Results Panel */}
        <section id="result-view-panel" className="lg:col-span-7 flex flex-col h-full min-h-[500px] space-y-6">
          
          {/* Detailed instructional setup view for Google Sheets config */}
          {showConfigHelp && (
            <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 animate-fade-in relative z-20">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-extrabold flex items-center gap-2 text-blue-400">
                  <Database className="w-4 h-4 text-emerald-400" />
                  คู่มือเชื่อม Google Sheets ด้วยตนเอง (กติกาการตั้งค่าไฟล์ .env)
                </h3>
                <button 
                  onClick={() => setShowConfigHelp(false)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg text-slate-300 transition-colors"
                >
                  ปิดคู่มือ
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                ระบบหลังบ้านรองรับการส่งผ่านข้อมูลลง Google Sheet ส่วนตัวของคุณได้อย่างปลอดภัย เพียงนำสิทธิ์ Client ID และ Service Account คีย์ไปกำหนดค่าสภาพแวดล้อมดังนี้:
              </p>

              <div className="space-y-3.5">
                <div>
                  <span className="text-[11px] bg-blue-500/10 text-blue-400 font-extrabold px-2.5 py-0.5 rounded-full border border-blue-500/20 mr-2">1</span>
                  <span className="text-xs font-bold text-slate-200">ตั้งค่าฟอร์ม Login จริง (.env หรือ Vercel Frontend)</span>
                  <p className="text-[11px] text-slate-400 mt-1 pl-6">
                    สร้าง OAuth Client ID ใน Google Cloud Console แล้วอัญเชิญใส่ในตัวแปร: <code className="text-yellow-400 font-bold bg-slate-800 px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code>
                  </p>
                </div>

                <div>
                  <span className="text-[11px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/20 mr-2">2</span>
                  <span className="text-xs font-bold text-slate-200">จัดเตรียม Service Account คีย์ความปลอดภัยคุม Sheets (.env หลังบ้าน)</span>
                  <p className="text-[11px] text-slate-400 mt-1 pl-6">
                    สร้างบัญชีบริการ (Service Account) ใน GCP console ขอดาวน์โหลดคีย์ชนิด JSON นำมาใส่ค่าสภาพแวดล้อม:
                  </p>
                  <ul className="list-disc pl-12 text-[11px] text-slate-400 mt-1.5 space-y-1">
                    <li><code className="text-emerald-400 font-bold">GOOGLE_SERVICE_ACCOUNT_EMAIL</code>: อีเมลของ Service Account ที่ระบบแจกให้</li>
                    <li><code className="text-emerald-400 font-bold">GOOGLE_PRIVATE_KEY</code>: คีย์ความเป็นส่วนตัวชนิด Private Key (ขึ้นต้นด้วย -----BEGIN PRIVATE KEY-----)</li>
                  </ul>
                </div>

                <div>
                  <span className="text-[11px] bg-indigo-500/10 text-indigo-400 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-500/20 mr-2">3</span>
                  <span className="text-xs font-bold text-slate-200">ระบุพิกัดแผ่นชีต Google Sheets</span>
                  <p className="text-[11px] text-slate-400 mt-1 pl-6">
                    สร้างไฟล์ Google Sheets จากนั้นกดปุ่มแชร์ส่งสิทธิ์การเป็น <b>"Editor (ผู้เขียนและแก้ไข)"</b> ไปยังอีเมลของ Service Account ดังกล่าว แล้วนำ ID ของ Spreadsheet ใส่ตัวแปร: <code className="text-indigo-400 font-bold bg-slate-800 px-1 py-0.5 rounded">GOOGLE_SHEET_ID</code>
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/55 p-3.5 rounded-xl border border-slate-800/80 text-[11px]">
                <span className="font-extrabold text-[#f1f5f9] block mb-1">🔗 แหล่งข้อมูลเพิ่มเติม</span>
                <span className="text-slate-400">
                  คุณสามารถเข้าไปเปิดประตูกำหนด Credentials ได้ที่เว็บตรงของกูเกิลคอนโซล: 
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-400 inline-flex items-center gap-1 hover:underline ml-1.5 font-bold">
                    GCP Console <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </div>
            </div>
          )}

          {!activeAnalysis ? (
            /* Idle Placeholder view */
            <div className="flex-1 bg-white border border-[#e2e8f0] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-[0_4px_22px_rgba(0,0,0,0.01)]">
              <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl flex items-center justify-center text-[#94a3b8] mb-6 border border-[#e2e8f0] animate-bounce">
                <Cpu className="w-8 h-8 text-[#2563eb]" />
              </div>
              
              <h3 className="text-lg lg:text-xl font-bold text-[#0f172a] mb-2">พร้อมตรวจเช็ควิเคราะห์อาการด้วยช่าง AI</h3>
              <p className="text-[#64748b] text-xs lg:text-sm max-w-sm leading-relaxed mb-6 font-medium">
                กรอกรุ่นอุปกรณ์และรายละเอียดอาการเสียด้านซ้ายมือ จากนั้นกด <b>“วิเคราะห์อาการเสียด้วย AI”</b> เพื่อตรวจสอบอะไหล่และส่องงบราคาประเมินทันที
              </p>

              <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-4 text-left">
                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[#2563eb] mb-1">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-bold">แจ้งครอบคลุมทุกอุปกรณ์</span>
                    </div>
                    <p className="text-[11px] text-[#64748b] mt-1 leading-relaxed">รถจักรยานยนต์, เครื่องยนต์, ทีวี, เครื่องใช้ไฟฟ้า และเครื่องจักรอุตสาหกรรมเบื้องต้น</p>
                  </div>
                </div>

                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[#2563eb] mb-1">
                      <Sparkles className="w-4 h-4 text-amber-505 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold">ระบบอัตราส่วนราคากลาง</span>
                    </div>
                    <p className="text-[11px] text-[#64748b] mt-1 leading-relaxed">ประมวลราคาและอัตราค่าเฉลี่ยอะไหล่ให้ใกล้เคียงตามแนวระดับโรงซ่อมจริงในประเทศไทย</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Active Analysis Form Results */
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-[#e2e8f0] overflow-hidden flex flex-col justify-between flex-1 animate-fade-in relative">
              
              {/* Result Header Badge */}
              <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 lg:px-8 py-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider">
                    รายงานประเมินจากวิศวกร AI อัจฉริยะ (อ.การช่าง)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    ความแม่นยำสูง
                  </span>
                </div>
              </div>

              {/* Main Content Areas */}
              <div className="p-6 lg:p-8 flex-1 space-y-6 lg:space-y-8">
                
                {/* 1. Device Preview */}
                <div className="bg-blue-50/35 p-4 rounded-xl border border-blue-50 flex items-start gap-3">
                  <Wrench className="w-5 h-5 text-[#2563eb] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider">อุปกรณ์ที่วิเคราะห์</h4>
                    <span className="text-base font-extrabold text-[#0f172a] block mt-0.5">{device || "ไม่ระบุรุ่น"}</span>
                    <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                      <span className="font-semibold text-gray-500">อาการเสีย:</span> "{symptoms}" ({duration})
                    </p>
                  </div>
                </div>

                {/* 2. core analysis summary */}
                <div>
                  <h4 className="text-xs lg:text-sm font-bold text-[#0f172a] mb-2.5 flex items-center gap-2 uppercase tracking-wide">
                    <span className="w-1.5 h-3 bg-blue-600 rounded"></span>
                    ผลการวิเคราะห์เจาะลึกและหาสาเหตุ
                  </h4>
                  <p className="text-[#334155] leading-relaxed text-sm bg-slate-50/75 p-4 rounded-xl border border-slate-100 font-medium">
                    {activeAnalysis.analysis}
                  </p>
                </div>

                {/* 3. parts & Price Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Spare parts list */}
                  <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] flex flex-col justify-between">
                    <div>
                      <h5 className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3">
                        อะไหล่ที่คาดว่าต้องเปลี่ยน/ตรวจสอบ
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {activeAnalysis.parts && activeAnalysis.parts.length > 0 ? (
                          activeAnalysis.parts.map((p, idx) => (
                            <span 
                              key={idx} 
                              className="px-2.5 py-1.5 bg-[#f1f5f9] text-[#334155] rounded-lg text-xs font-bold border border-[#e2e8f0] hover:border-blue-400 hover:bg-blue-50 transition-colors"
                            >
                              ⚙️ {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs italic text-[#94a3b8]">ไม่ต้องเปลี่ยนอะไหล่ชิ้นหลัก</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Estimation Costs */}
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50/20 p-5 rounded-xl border border-[#e2e8f0] flex flex-col justify-between">
                    <div>
                      <h5 className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
                        ราคาประเมินเบื้องต้น (รวมค่าแรง)
                      </h5>
                      <div className="text-2xl lg:text-3xl font-black text-[#2563eb] tracking-tight">
                        {activeAnalysis.price}
                      </div>
                      <span className="text-[10px] text-[#94a3b8] mt-1.5 block">
                        * เพื่อใช้อ้างอิงสำหรับการจัดเสนอราคาของศูนย์และอู่หน้างานยนต์
                      </span>
                    </div>
                  </div>

                </div>

                {/* 4. Recommendation Warning Card */}
                {activeAnalysis.recommendation && (
                  <div className="p-4 bg-amber-50/55 rounded-xl border border-amber-100 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-amber-900 mb-0.5">คำแนะนำการบรรเทารักษาและป้องกันเบื้องต้น</h5>
                      <p className="text-xs text-amber-850 leading-relaxed font-medium text-amber-800">
                        {activeAnalysis.recommendation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Feedback message after saving Sheets on local request */}
                {sheetMessage && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    sheetMessage.type === "success" 
                      ? "bg-green-50 border-green-200 text-green-800" 
                      : sheetMessage.type === "warn"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}>
                    <Database className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold block">
                        {sheetMessage.type === "success" ? "สถานะการเก็บข้อมูล" : "แจ้งเตือนระบบตัวชี้วัดข้อมูล"}
                      </span>
                      <p className="text-[11px] mt-0.5 leading-relaxed font-medium">
                        {sheetMessage.text}
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Action row */}
              <div className="bg-[#f8fafc] border-t border-[#e2e8f0] p-6 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handlePrint}
                  className="flex-1 py-3 border-2 border-[#e2e8f0] text-[#475569] font-bold rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  พิมพ์รายงานแจ้งซ่อม
                </button>

                <button 
                  onClick={handleSaveTicket}
                  disabled={sheetSaving}
                  className={`flex-1 py-3 bg-gray-950 text-white font-bold rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 group border border-transparent ${
                    sheetSaving ? "opacity-70 cursor-not-allowed" : "hover:bg-slate-900 hover:shadow-xl active:scale-98"
                  }`}
                >
                  {sheetSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      กำลังเซฟลงระบบ Google Sheet...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      บันทึกข้อมูลและส่ง Google Sheet
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </section>

      </main>

      {/* Footer copyright */}
      <footer className="mt-auto py-8 bg-white border-t border-[#e2e8f0] text-center px-4">
        <p className="text-xs text-[#a0aec0] font-medium">
          © {new Date().getFullYear()} อ.การช่าง AI Diagnostic System. แพลตฟอร์มซ่อมบำรุงวิบากและอัจฉริยะวิศวกรรม
        </p>
        <p className="text-[10px] text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
          ความช่วยเหลือเชิงปฏิบัติเพื่อประเมินราคาอะไหล่รถและใช้จัดตรวจเบื้องต้น กรุณาสนับสนุนผู้เชี่ยวชาญช่างโรงสิทธิ์ในพื้นที่ก่อนซ่อมแซมจริง
        </p>
      </footer>
    </div>
  );
}
