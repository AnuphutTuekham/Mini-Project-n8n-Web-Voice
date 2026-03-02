import { NextResponse } from "next/server";

export const runtime = "nodejs";

function extractAnswer(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return "ไม่พบข้อความตอบกลับจาก n8n";
  }

  try {
    const parsed = JSON.parse(trimmed) as { answer?: string; text?: string; message?: string };
    if (typeof parsed.answer === "string" && parsed.answer.trim()) {
      return parsed.answer;
    }
    if (typeof parsed.text === "string" && parsed.text.trim()) {
      return parsed.text;
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: string };
    const userMessage = typeof body.message === "string" ? body.message : "";

    if (!userMessage.trim()) {
      return NextResponse.json({ error: "ไม่มีข้อความ" }, { status: 400 });
    }

    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
      return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า N8N_WEBHOOK_URL" }, { status: 500 });
    }

    const resp = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        text: userMessage,
        lang: "th",
      }),
    });

    const rawResponse = await resp.text();
    const answer = extractAnswer(rawResponse);

    return NextResponse.json(
      {
        message: userMessage,
        reply: answer,
      },
      { status: resp.ok ? 200 : resp.status },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
