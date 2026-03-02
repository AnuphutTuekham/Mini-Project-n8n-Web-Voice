import { NextResponse } from "next/server";

export const runtime = "nodejs";

// กำหนด Interface สำหรับความปลอดภัยของข้อมูล (Type Safety)
interface PCPart {
  category: string;
  name: string;
  price: number;
  spec: string;
  source_url?: string;
  url?: string; // เผื่อ AI ส่งมาในชื่อ url
  link?: string; // เผื่อ AI ส่งมาในชื่อ link
}

interface N8nResponse {
  message?: string;
  raw_data?: {
    parts?: PCPart[];
    total?: number;
    note?: string;
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: string };
    const userMessage = typeof body.message === "string" ? body.message : "";

    if (!userMessage.trim()) {
      return NextResponse.json({ error: "ไม่มีข้อความจากผู้ใช้" }, { status: 400 });
    }

    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
      return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า N8N_WEBHOOK_URL ใน Environment" }, { status: 500 });
    }

    // ส่งข้อมูลไปยัง n8n Webhook
    const resp = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        text: userMessage, // ส่งทั้งสองแบบเพื่อรองรับ Prompt หลายรูปแบบ
        lang: "th",
      }),
    });

    const rawResponse = await resp.text();
    let reply = "ไม่พบข้อความตอบกลับที่ถูกต้องจากระบบ AI";

    try {
      const parsed = JSON.parse(rawResponse) as N8nResponse;

      // ตรวจสอบว่ามีโครงสร้าง raw_data ตามที่ออกแบบไว้ใน Code Node หรือไม่
      if (
        parsed.raw_data &&
        Array.isArray(parsed.raw_data.parts) &&
        parsed.raw_data.parts.length > 0
      ) {
        const lines = parsed.raw_data.parts.map((part) => {
          // Logic การเลือกลิงก์: ตรวจสอบทุกความเป็นไปได้ของชื่อ Key
          const link = part.source_url || part.url || part.link || "ไม่มีลิงก์อ้างอิง";
          
          return `[${part.category}]\n` +
                 `• ชื่อสินค้า: ${part.name}\n` +
                 `• ราคา: ${part.price.toLocaleString()} บาท\n` +
                 `• สเปก: ${part.spec}\n` +
                 `• ลิงก์อ้างอิง: ${link}`;
        });

        const totalValue = parsed.raw_data.total?.toLocaleString() ?? "0";
        const noteText = parsed.raw_data.note ?? "-";

        reply =
          `📋 รายงานการจัดสเปคคอมพิวเตอร์\n` +
          `--------------------------------------\n\n` +
          `${lines.join("\n\n")}\n\n` +
          `--------------------------------------\n` +
          `💰 ราคารวมสุทธิ: ${totalValue} บาท\n\n` +
          `💡 หมายเหตุจากผู้เชี่ยวชาญ: ${noteText}\n\n` +
          `⚠️ ราคาอาจมีการเปลี่ยนแปลงตามโปรโมชั่นของแต่ละร้านค้า`;
          
      } else if (parsed.message) {
        // กรณี AI ตอบกลับเป็นข้อความปกติ (เช่น เมื่อติด Rate Limit หรือตอบ JSON พลาด)
        reply = parsed.message;
      }
    } catch (parseError) {
      // หาก Parse JSON ไม่สำเร็จ ให้ใช้ข้อความดิบที่ส่งมา
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
      console.error("API Route Error:", e);
      return NextResponse.json({ error: e?.message ?? "Internal Server Error" }, { status: 500 });
    }
  }