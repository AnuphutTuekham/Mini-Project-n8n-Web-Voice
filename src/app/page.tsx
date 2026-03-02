"use client";

import { useEffect, useRef, useState } from "react";
import Chat from "./components/Chat";

type ApiResult = {
  transcript?: string;
  answer?: string;
  matches?: Array<any>;
  error?: string;
};

type Mode = "voice" | "chat";

export default function Home() {
  const [mode, setMode] = useState<Mode>("voice");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("พร้อมรับคำถาม");
  const [result, setResult] = useState<ApiResult>({});
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState("");
  const [micInputLevel, setMicInputLevel] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [useTextMode, setUseTextMode] = useState(false);

  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const processingRef = useRef(false);

  // --- Logic Functions (คงเดิมตามของคุณ) ---
  function stopMicMonitor() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicInputLevel(0);
  }

  function startMicMonitor(stream: MediaStream) {
    const AudioCtx = globalThis.AudioContext || (globalThis as any).webkitAudioContext;
    if (!AudioCtx) return;
    stopMicMonitor();
    const audioContext = new AudioCtx();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
    dataArrayRef.current = dataArray;

    const updateLevel = () => {
      const node = analyserRef.current;
      const bytes = dataArrayRef.current;
      if (!node || !bytes) return;

      (node.getByteTimeDomainData as (data: Uint8Array) => void)(bytes);

      let sumSquares = 0;
      for (const byte of bytes) {
        const normalized = (byte - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / bytes.length);
      setMicInputLevel(Math.min(1, rms * 10)); // ปรับ Multiplier ให้แสดงผลกราฟสวยขึ้น
      frameRef.current = requestAnimationFrame(updateLevel);
    };
    frameRef.current = requestAnimationFrame(updateLevel);
  }

  async function setupMicrophones(preferredMicId?: string) {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((device) => device.kind === "audioinput");
      setMicrophones(audioInputs);
      if (!audioInputs.length) return;
      let nextMicId = audioInputs[0].deviceId;
      if (preferredMicId && audioInputs.some((mic) => mic.deviceId === preferredMicId)) {
        nextMicId = preferredMicId;
      }
      setSelectedMicId(nextMicId);
    } catch {
      setStatus("ไม่สามารถเข้าถึงไมโครโฟนได้");
    }
  }

  async function bindSelectedMic(deviceId: string) {
    if (!deviceId || !navigator.mediaDevices?.getUserMedia) return;
    try {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      micStreamRef.current = stream;
      startMicMonitor(stream);
    } catch {
      setStatus("เชื่อมต่อไมค์ไม่สำเร็จ");
    }
  }

  useEffect(() => {
    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("เบราว์เซอร์ไม่รองรับ (โปรดใช้ Chrome)");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "th-TH";
    rec.interimResults = false;
    rec.onstart = () => { setIsListening(true); setStatus("กำลังฟัง..."); };
    rec.onend = () => { setIsListening(false); if (!processingRef.current) setStatus("พร้อมรับคำถาม"); };
    rec.onerror = (e: any) => { setIsListening(false); setStatus(`Error: ${e.error}`); };
    rec.onresult = async (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      processingRef.current = true;
      setIsProcessing(true);
      setStatus("กำลังประมวลผล...");
      setResult({ transcript });
      try {
        const resp = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: transcript, transcript }),
        });
        const data: ApiResult = await resp.json();
        setResult({ ...data, transcript: data.transcript ?? transcript });
        setStatus(data.error ? "เกิดข้อผิดพลาด" : "ประมวลผลเสร็จสิ้น");
      } catch {
        setResult({ transcript, error: "Network Error" });
        setStatus("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    };
    recognitionRef.current = rec;
    setupMicrophones();
  }, []);

  useEffect(() => {
    if (selectedMicId) bindSelectedMic(selectedMicId);
  }, [selectedMicId]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setResult({});
      recognitionRef.current?.start();
    }
  };

  const handleTextSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const transcript = textInput.trim();
    processingRef.current = true;
    setIsProcessing(true);
    setStatus("กำลังประมวลผล...");
    setResult({ transcript });
    setTextInput("");

    try {
      const resp = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript, transcript }),
      });
      const data: ApiResult = await resp.json();
      setResult({ ...data, transcript: data.transcript ?? transcript });
      setStatus(data.error ? "เกิดข้อผิดพลาด" : "ประมวลผลเสร็จสิ้น");
    } catch {
      setResult({ transcript, error: "Network Error" });
      setStatus("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }

  return (
    <>
      {(mode as Mode) === "voice" ? (
        <main className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300">
          <div className="mx-auto max-w-4xl mb-8">
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setMode("voice" as Mode)}
                className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                  (mode as Mode) === "voice"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-4xl">
            {/* Header Section */}
            <header className="mb-10 text-center">
              <div className="inline-flex items-center rounded-full bg-blue-500/10 px-4 py-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4">
                <span className="relative mr-2 flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75 ${!isListening && 'hidden'}`}></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                </span>
                AI Audio Interface v1.0
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                Voice IT Shop
              </h1>
              <p className="text-slate-500 dark:text-slate-400">ลองพูดว่าจัดสเปคคอมและงบที่มีเพื่อถาม เช่น จัดสเปคคอมงบ 40,000 บาท</p>
            </header>

            <div className="grid gap-8 lg:grid-cols-12">
              
              {/* Left: Microphone & Control */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-3xl border border-white/20 bg-white/50 dark:bg-slate-800/50 p-8 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl">
                  <div className="flex flex-col items-center">
                    {/* Voice Visualizer Circle */}
                    <div className="relative mb-8">
                       <div 
                        className="absolute inset-0 rounded-full bg-blue-500/20 transition-transform duration-150"
                        style={{ transform: `scale(${1 + micInputLevel * 1.5})` }}
                      ></div>
                      <button
                        onClick={toggleListening}
                        disabled={isProcessing}
                        className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full shadow-2xl transition-all active:scale-90 ${
                          isListening 
                            ? 'bg-red-500 text-white animate-pulse shadow-red-500/50' 
                            : 'bg-blue-600 text-white shadow-blue-600/50 hover:bg-blue-700'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isListening ? (
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                        ) : (
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        )}
                      </button>
                    </div>

                    <div className="text-center mb-6">
                      <h3 className="text-lg font-bold">{isListening ? "กำลังรับฟังเสียง..." : status}</h3>
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
                        {isProcessing ? "AI Is Thinking" : "Press to start"}
                      </p>
                    </div>

                    {/* Mic Selector */}
                    <div className="w-full space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Input Source</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                        value={selectedMicId}
                        onChange={(e) => setSelectedMicId(e.target.value)}
                      >
                        {microphones.map((mic) => (
                          <option key={mic.deviceId} value={mic.deviceId}>{mic.label || 'Microphone'}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => setupMicrophones(selectedMicId)}
                        className="w-full text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Refresh Device List
                      </button>
                    </div>

                    {/* Text Input Option */}
                    <form onSubmit={handleTextSubmit} className="w-full space-y-3">
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="หรือพิมพ์คำถามที่นี่..."
                        disabled={isProcessing}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                      <button
                        type="submit"
                        disabled={isProcessing || !textInput.trim()}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:bg-slate-400 transition-all font-semibold"
                      >
                        {isProcessing ? "กำลังประมวลผล..." : "ส่ง"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Right: Results Display */}
              <div className="lg:col-span-7 space-y-4">
                {/* Transcript Card */}
                <div className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:border-blue-500/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">ถอดความเสียง</h3>
                  </div>
                  <div className="text-lg font-medium leading-relaxed min-h-[3rem]">
                    {result.transcript ? (
                      <span className="text-slate-700 dark:text-slate-200 italic">"{result.transcript}"</span>
                    ) : (
                       <span className="text-slate-300 dark:text-slate-700">รอรับคำถาม...</span>
                    )}
                  </div>
                </div>

                {/* Answer Card */}
                <div className={`rounded-2xl border p-6 shadow-lg transition-all duration-500 ${isProcessing ? 'border-blue-500 animate-pulse' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">คำตอบจาก AI</h3>
                  </div>
                  
                  <div className="min-h-[10rem]">
                    {isProcessing ? (
                       <div className="flex flex-col gap-2">
                         <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                         <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                         <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                       </div>
                    ) : result.answer ? (
                      <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap space-y-3 leading-relaxed">{result.answer}</div>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">รอคำตอบ...</span>
                    )}
                  </div>

                  {result.error && (
                    <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-medium flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {result.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Background Decor */}
          <div className="fixed -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>
          <div className="fixed -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
        </main>
      ) : (
        <Chat />
      )}
    </>
  );
}