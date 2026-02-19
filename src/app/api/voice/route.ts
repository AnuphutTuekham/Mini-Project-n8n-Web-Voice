import { NextResponse } from "next/server";
import products from "../../../data/products.json";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; transcript?: string };
    const incomingText = typeof body.text === "string" ? body.text : "";
    const incomingTranscript = typeof body.transcript === "string" ? body.transcript : "";
    const transcript = (incomingTranscript || incomingText).trim();

    if (!transcript) {
      return NextResponse.json({ error: "ไม่มีข้อความจากการพูด" }, { status: 400 });
    }

    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
      return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า N8N_WEBHOOK_URL" }, { status: 500 });
    }

    const resp = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        text: transcript,
        products,
        lang: "th",
      }),
    });

    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(
      {
        ...data,
        transcript: (data as { transcript?: string }).transcript ?? transcript,
      },
      { status: resp.ok ? 200 : resp.status },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
