import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
    let reply = "ไม่พบข้อความตอบกลับจาก n8n";

    try {
      const parsed = JSON.parse(rawResponse) as {
        message?: string;
        raw_data?: {
          parts?: Array<{ category: string; name: string; price: number; spec: string; source_url?: string }>;
          total?: number;
          note?: string;
        };
      };

      if (
        parsed.raw_data &&
        Array.isArray(parsed.raw_data.parts) &&
        typeof parsed.raw_data.total === "number" &&
        typeof parsed.raw_data.note === "string"
      ) {
        const lines = parsed.raw_data.parts.map(
          (part:any) =>
            `${part.category}\n` +
            `ชื่อสินค้า: ${part.name}\n` +
            `ราคา: ${part.price.toLocaleString()} บาท\n` +
            `สเปค: ${part.spec}\n` +
            `ลิงก์อ้างอิง: ${part.source_url || part.url || "ไม่มีลิงก์อ้างอิง"}`)
        ;

        reply =
          `รายงานการจัดสเปคคอมพิวเตอร์\n` +
          `--------------------------------------\n\n` +
          `${lines.join("\n\n")}\n\n` +
          `--------------------------------------\n` +
          `ราคารวมสุทธิ: ${parsed.raw_data.total.toLocaleString()} บาท\n\n` +
          `หมายเหตุ: ${parsed.raw_data.note}`;
      } else if (parsed.message && typeof parsed.message === "string") {
        reply = parsed.message;
      }
    } catch {
      // If parsing fails, just use the raw response
      if (rawResponse.trim()) {
        reply = rawResponse;
      }
    }

    return NextResponse.json(
      {
        message: userMessage,
        reply: reply,
      },
      { status: resp.ok ? 200 : resp.status },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
