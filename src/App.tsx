import { useState, useEffect, FormEvent, MouseEvent } from "react";
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
  ChevronRight,
  Trash2,
  FileCheck
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

export default function App() {
  // Form coordinates
  const [device, setDevice] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("เพิ่งเป็น");

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active result state
  const [activeAnalysis, setActiveAnalysis] = useState<RepairAnalysis | null>(null);

  // Local storage history of tickets
  const [tickets, setTickets] = useState<RepairTicket[]>([]);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected historic ticket
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Load tickets on mount
  useEffect(() => {
    const saved = localStorage.getItem("or_kar_chang_tickets");
    if (saved) {
      try {
        setTickets(JSON.parse(saved));
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
    }, 4000);
  };

  // Trigger analysis call to proxy server
  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault();
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
      showToast("วิเคราะห์อาการด้วย AI สำเร็จเสร็จสิ้น!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // Save the result into our system logs (persisted locally)
  const handleSaveTicket = () => {
    if (!activeAnalysis) return;

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

    const updated = [newTicket, ...tickets];
    setTickets(updated);
    localStorage.setItem("or_kar_chang_tickets", JSON.stringify(updated));
    setSelectedTicketId(newTicket.id);
    showToast(`บันทึกข้อมูลเรียบร้อยแล้ว: หมายเลข ${newTicket.id}`);
  };

  // Print function
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
  };

  // Reset form to write brand new one
  const handleNewAnalysis = () => {
    setDevice("");
    setSymptoms("");
    setDuration("เพิ่งเป็น");
    setActiveAnalysis(null);
    setSelectedTicketId(null);
    setError(null);
  };

  return (
    <div id="ai-estimate-root" className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 transition-all duration-300">
      {/* Absolute Toast Notification */}
      {toastMessage && (
        <div id="toast-notif" className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-[#0f172a] text-white px-5 py-4 rounded-xl shadow-2xl border border-gray-800 animate-slide-in max-w-sm pointer-events-auto">
          <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <header id="main-header" className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#e2e8f0] px-6 lg:px-12 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleNewAnalysis}>
            <div className="w-10 h-10 bg-[#2563eb] rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 transition-transform hover:scale-105">
              <Wrench className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#0f172a]">อ.การช่าง</span>
                <span className="text-xs bg-blue-50 text-[#2563eb] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">AI Engineer</span>
              </div>
              <p className="text-xs text-[#64748b] hidden sm:block">ระบบวินิจฉัยและประเมินราคางานซ่อมบำรุงอัจฉริยะ</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-xs text-[#a0aec0] uppercase tracking-widest font-black">Powered by</span>
              <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Gemini 3.5 Flash
              </span>
            </div>
            
            <div className="h-8 w-[1px] bg-[#e2e8f0] hidden lg:block"></div>

            <button 
              onClick={handleNewAnalysis}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#2563eb] hover:bg-blue-50 rounded-xl transition-all border border-blue-100"
            >
              <Plus className="w-3.5 h-3.5" />
              แจ้งวิเคราะห์ใหม่
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Input form & Historic Lists */}
        <section className="lg:col-span-5 space-y-6">
          
          {/* Main Assessment Form Card */}
          <div id="repair-form-card" className="bg-white rounded-2xl shadow-[0_4px_22px_rgba(0,0,0,0.02)] border border-[#e2e8f0] p-6 lg:p-8 relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#2563eb]"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-[#0f172a] flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#2563eb]" />
                รายละเอียดแจ้งซ่อมอาการเสีย
              </h2>
              {selectedTicketId && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-bold">
                  โหมดดูประวัติ: {selectedTicketId}
                </span>
              )}
            </div>

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
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] transition-all h-32 resize-none text-[#334155] placeholder:text-[#94a3b8] text-sm leading-relaxed"
                  disabled={loading}
                  required
                ></textarea>
              </div>

              {/* Duration select */}
              <div>
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">
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
                    className="flex-1 py-3.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    เขียนใบใหม่
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={loading}
                  className={`flex-[2] py-3.5 bg-[#2563eb] text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all ${
                    loading ? "opacity-75 cursor-not-allowed scale-[0.99]" : "hover:bg-[#1d4ed8] hover:shadow-xl hover:shadow-blue-200 active:scale-[0.98]"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังส่งวิเคราะห์ด้วยช่าง AI...
                    </>
                  ) : (
                    <>
                      <Cpu className="w-4 h-4" />
                      วิเคราะห์อาการด้วย AI อัจฉริยะ
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* History / Recent tickets */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] border border-[#e2e8f0] p-6 lg:p-7">
            <h3 className="text-sm font-bold text-[#475569] uppercase tracking-wider mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-[#64748b]" />
              ประวัติวิเคราะห์ & ตั๋วแจ้งซ่อมล่าสุด ({tickets.length})
            </h3>

            {tickets.length === 0 ? (
              <div className="text-center py-8 text-[#94a3b8] border-2 border-dashed border-[#e2e8f0] rounded-xl">
                <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50 stroke-[1.5]" />
                <p className="text-xs font-semibold">ไม่มีรายการบันทึกประวัติ</p>
                <p className="text-[11px] mt-0.5">หลังจาก AI รายงานวิเคราะห์แล้ว คลิกปุ่ม "บันทึกลงระบบ" เพื่อแสดงในหน้านี้</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
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
                          <span className="text-[10px] text-[#94a3b8]">{t.timestamp}</span>
                        </div>
                        <h4 className="text-xs font-bold text-[#1e293b] truncate">{t.device}</h4>
                        <p className="text-[11px] text-[#64748b] truncate mt-0.5">{t.symptoms}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-blue-600 shrink-0">{t.analysis.price}</span>
                        <button
                          onClick={(e) => handleDeleteTicket(t.id, e)}
                          className="p-1 px-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
        <section id="result-view-panel" className="lg:col-span-7 flex flex-col h-full min-h-[500px]">
          
          {!activeAnalysis ? (
            /* Idle Placeholder view */
            <div className="flex-1 bg-white border border-[#e2e8f0] rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
              <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl flex items-center justify-center text-[#94a3b8] mb-6 border border-[#e2e8f0] animate-bounce">
                <Cpu className="w-8 h-8 text-[#2563eb]" />
              </div>
              
              <h3 className="text-xl font-bold text-[#0f172a] mb-2">พร้อมตรวจเช็คกับ AI ช่างมือโปร</h3>
              <p className="text-[#64748b] text-sm max-w-sm leading-relaxed mb-6">
                กรอกรุ่นอุปกรณ์และรายละเอียดอาการเสียด้านซ้ายมือ จากนั้นกด <b>“วิเคราะห์อาการด้วย AI”</b> เพื่อตรวจสอบอะไหล่และประเมินราคาทันที
              </p>

              <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-4 text-left">
                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
                  <div className="flex items-center gap-2 text-[#2563eb] mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">แจ้งครอบคลุม</span>
                  </div>
                  <p className="text-[11px] text-[#64748b]">ยานยนต์, เครื่องเสียง, เครื่องซักผ้า, ทีวี, เครื่องใช้ไฟฟ้าทุกชนิด</p>
                </div>

                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
                  <div className="flex items-center gap-2 text-[#2563eb] mb-1">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold">ฐานข้อมูลอะไหล่</span>
                  </div>
                  <p className="text-[11px] text-[#64748b]">อิงรายการราคาศูนย์บริการและราคาตลาดกลางในประเทศ</p>
                </div>
              </div>
            </div>
          ) : (
            /* Active Analysis Form Results */
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e2e8f0] overflow-hidden flex flex-col justify-between flex-1 animate-fade-in relative">
              
              {/* Result Header Badge */}
              <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  <h3 className="text-xs lg:text-sm font-bold text-[#475569] uppercase tracking-wider">
                    รายงานประเมินจากวิศวกร AI อัจฉริยะ (อ.การช่าง)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] lg:text-[11px] font-bold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    ความแม่นยำสูง ~95%
                  </span>
                </div>
              </div>

              {/* Main Content Areas */}
              <div className="p-6 lg:p-8 flex-1 space-y-8">
                
                {/* 1. Device Preview */}
                <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-50 flex items-start gap-3">
                  <Wrench className="w-5 h-5 text-[#2563eb] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">อุปกรณ์ที่วิเคราะห์</h4>
                    <span className="text-base font-bold text-[#0f172a] block mt-0.5">{device || "ไม่ระบุรุ่น"}</span>
                    <p className="text-xs text-[#64748b] mt-1">
                      <span className="font-semibold text-gray-500">อาการเสีย:</span> "{symptoms}" ({duration})
                    </p>
                  </div>
                </div>

                {/* 2. core analysis summary */}
                <div>
                  <h4 className="text-sm font-bold text-[#0f172a] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-blue-600 rounded"></span>
                    ผลการวิเคราะห์เจาะลึกและหาสาเหตุ
                  </h4>
                  <p className="text-[#334155] leading-relaxed text-sm lg:text-base bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    {activeAnalysis.analysis}
                  </p>
                </div>

                {/* 3. parts & Price Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Spare parts list */}
                  <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] flex flex-col justify-between">
                    <div>
                      <h5 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3">
                        อะไหล่ที่คาดว่าต้องเปลี่ยน/ตรวจสอบ
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {activeAnalysis.parts && activeAnalysis.parts.length > 0 ? (
                          activeAnalysis.parts.map((p, idx) => (
                            <span 
                              key={idx} 
                              className="px-3 py-1.5 bg-[#f1f5f9] text-[#334155] rounded-lg text-xs font-medium border border-[#e2e8f0] hover:border-blue-400 hover:bg-blue-50 transition-colors"
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
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50/45 p-5 rounded-xl border border-[#e2e8f0] flex flex-col justify-between">
                    <div>
                      <h5 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
                        ราคาประเมินเบื้องต้น (รวมค่าแรง)
                      </h5>
                      <div className="text-3xl lg:text-4xl font-extrabold text-[#2563eb] tracking-tight">
                        {activeAnalysis.price}
                      </div>
                      <span className="text-[11px] text-[#94a3b8] mt-1.5 block">
                        * เพื่อใช้อ้างอิงการจัดซื้อและการต่อเสนอแนะราคาของช่างหน้างาน
                      </span>
                    </div>
                  </div>

                </div>

                {/* 4. Recommendation Warning Card */}
                {activeAnalysis.recommendation && (
                  <div className="p-5 bg-amber-50/75 rounded-2xl border border-amber-100 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-amber-900 mb-1">คำแนะนำการซ่อมบำรุงและแนวทางป้องกันเบื้องต้นจากช่าง AI</h5>
                      <p className="text-xs text-amber-800 leading-relaxed italic">
                        "{activeAnalysis.recommendation}"
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Action row */}
              <div className="bg-[#f8fafc] border-t border-[#e2e8f0] p-6 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handlePrint}
                  className="flex-1 py-3.5 border-2 border-[#e2e8f0] text-[#475569] font-bold rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-xs lg:text-sm flex items-center justify-center gap-2 "
                >
                  <Printer className="w-4 h-4" />
                  พิมพ์ใบรับแจ้ง & วิเคราะห์
                </button>

                <button 
                  onClick={handleSaveTicket}
                  className="flex-1 py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg shadow-gray-200 hover:bg-black transition-all text-xs lg:text-sm flex items-center justify-center gap-2 group"
                >
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  บันทึกลงระบบจัดการแจ้งซ่อม
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          )}

        </section>

      </main>

      {/* Footer copyright */}
      <footer className="mt-auto py-8 bg-white border-t border-[#e2e8f0] text-center">
        <p className="text-xs text-[#a0aec0]">
          © {new Date().getFullYear()} อ.การช่าง AI Diagnostic System. สงวนลิขสิทธิ์ความปลอดภัยทางวิศวกรรม
        </p>
        <p className="text-[10px] text-gray-400 mt-1 max-w-sm mx-auto">
          คำเตือน: ข้อมูลนี้เป็นข้อมูลระบบวิเคราะห์อัจฉริยะเบื้องต้น ควรตรวจสอบความปลอดภัยจากช่างยนต์ผู้ชำนาญการก่อนลงมือซ่อมบำรุงจริง
        </p>
      </footer>
    </div>
  );
}
