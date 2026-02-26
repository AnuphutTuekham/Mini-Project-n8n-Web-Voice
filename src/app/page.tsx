"use client";

import { useEffect, useRef, useState } from "react";

type ApiResult = {
  transcript?: string;
  answer?: string;
  matches?: Array<any>;
  error?: string;
};

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("พร้อมพูด");
  const [result, setResult] = useState<ApiResult>({});
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState("");
  const [micInputLevel, setMicInputLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

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
    if (!AudioCtx) {
      return;
    }

    stopMicMonitor();

    const audioContext = new AudioCtx();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;

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
      if (!node || !bytes) {
        return;
      }

      node.getByteTimeDomainData(bytes);

      let sumSquares = 0;
      for (const byte of bytes) {
        const normalized = (byte - 128) / 128;
        sumSquares += normalized * normalized;
      }

      const rms = Math.sqrt(sumSquares / bytes.length);
      const normalizedLevel = Math.min(1, rms * 4);
      setMicInputLevel(normalizedLevel);
      frameRef.current = requestAnimationFrame(updateLevel);
    };

    frameRef.current = requestAnimationFrame(updateLevel);
  }

  async function setupMicrophones(preferredMicId?: string) {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((device) => device.kind === "audioinput");
      setMicrophones(audioInputs);

      if (!audioInputs.length) {
        return;
      }

      let nextMicId = audioInputs[0].deviceId;
      if (preferredMicId && audioInputs.some((mic) => mic.deviceId === preferredMicId)) {
        nextMicId = preferredMicId;
      } else if (selectedMicId && audioInputs.some((mic) => mic.deviceId === selectedMicId)) {
        nextMicId = selectedMicId;
      }

      if (nextMicId && nextMicId !== selectedMicId) {
        setSelectedMicId(nextMicId);
      }
    } catch {
      setStatus("ยังไม่ได้อนุญาตไมโครโฟน หรือไม่สามารถอ่านรายการไมค์ได้");
    }
  }

  async function bindSelectedMic(deviceId: string) {
    if (!deviceId || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      micStreamRef.current = stream;
      startMicMonitor(stream);
    } catch {
      setStatus("เปิดไมค์ที่เลือกไม่สำเร็จ ลองเลือกไมค์อื่น");
    }
  }

  useEffect(() => {
    // รองรับ Chrome: webkitSpeechRecognition
    const SpeechRecognition =
      (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("เบราว์เซอร์นี้ไม่รองรับ Web Speech API (แนะนำ Chrome เท่านั้น)");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "th-TH";
    rec.interimResults = false; // เอาเฉพาะผลสุดท้าย
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      setStatus("กำลังฟัง... พูดคำถามได้เลย");
    };

    rec.onend = () => {
      setIsListening(false);
      setStatus("หยุดฟังแล้ว");
    };

    rec.onerror = (e: any) => {
      setIsListening(false);
      setStatus(`เกิดข้อผิดพลาด: ${e?.error || "unknown"}`);
      setResult({ error: e?.error || "speech error" });
    };

    rec.onresult = async (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setStatus("ได้ข้อความแล้ว กำลังส่งไปถามระบบ...");
      setResult({ transcript });

      // ส่ง transcript ไป server (ไม่ส่งไฟล์เสียงแล้ว)
      const resp = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript, transcript }),
      });

      const data: ApiResult = await resp.json();
      setResult({ ...data, transcript: data.transcript ?? transcript });
      setStatus(data.error ? "เกิดข้อผิดพลาด" : "เสร็จสิ้น");
    };

    recognitionRef.current = rec;

    setupMicrophones();
    const onDeviceChange = () => {
      setupMicrophones(selectedMicId);
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      stopMicMonitor();
    };
  }, []);

  useEffect(() => {
    if (!selectedMicId) {
      return;
    }

    bindSelectedMic(selectedMicId);
  }, [selectedMicId]);

  async function start() {
    setResult({});
    if (selectedMicId) {
      await bindSelectedMic(selectedMicId);
    }

    try {
      recognitionRef.current?.start();
    } catch {
      // บางครั้ง start ซ้ำเร็วเกิน จะ throw
    }
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="rounded-2xl border border-foreground/15 bg-background/90 p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">IT Shop Voice Q&A</h1>
          <p className="mt-2 text-sm md:text-base text-foreground/80">
            กดเริ่มแล้วพูด เช่น “มี SSD 1TB ไหม ราคาเท่าไหร่”
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {isListening ? (
              <button
                className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
                onClick={stop}
              >
                หยุด
              </button>
            ) : (
              <button
                className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
                onClick={() => void start()}
              >
                เริ่มพูด
              </button>
            )}
            <div className="rounded-xl border border-foreground/15 bg-background px-4 py-2.5 text-sm text-foreground/90">
              {status}
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-foreground/15 bg-background/90 p-5">
            <h2 className="text-base font-semibold">ตั้งค่าไมโครโฟน</h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select
                className="min-w-0 flex-1 rounded-xl border border-foreground/15 bg-background px-3 py-2.5 text-sm outline-none ring-0"
                value={selectedMicId}
                onChange={(e) => setSelectedMicId(e.target.value)}
              >
                {microphones.length === 0 ? (
                  <option value="">ไม่พบไมโครโฟน</option>
                ) : (
                  microphones.map((mic, index) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `ไมค์ ${index + 1}`}
                    </option>
                  ))
                )}
              </select>
              <button
                className="rounded-xl border border-foreground/15 bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-foreground/5"
                onClick={() => void setupMicrophones(selectedMicId)}
              >
                รีเฟรชไมค์
              </button>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">ระดับเสียงที่เข้าไมค์</span>
                <span className="text-foreground/75">{Math.round(micInputLevel * 100)}%</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-foreground transition-[width] duration-100"
                  style={{ width: `${Math.round(micInputLevel * 100)}%` }}
                />
              </div>
            </div>
          </div>

        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-foreground/15 bg-background/90 p-5">
            <h3 className="text-sm font-semibold text-foreground/90">ข้อความที่ถอดเสียง</h3>
            <p className="mt-3 min-h-16 text-sm leading-6 text-foreground/90">
              {result.transcript ?? "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-foreground/15 bg-background/90 p-5">
            <h3 className="text-sm font-semibold text-foreground/90">คำตอบ</h3>
            <p className="mt-3 min-h-16 text-sm leading-6 text-foreground/90">{result.answer ?? "-"}</p>
            {result.error && <p className="mt-3 text-sm text-foreground">{result.error}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
