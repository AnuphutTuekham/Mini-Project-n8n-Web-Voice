# IT Shop Voice Q&A (Next.js + n8n)

เว็บแอปถาม-ตอบสินค้าไอทีด้วยเสียง โดยใช้ Web Speech API ฝั่งหน้าเว็บ และส่งข้อความที่ถอดเสียงไปยัง n8n webhook

## Local Setup

1. ติดตั้ง dependencies

```bash
npm install
```

2. สร้างไฟล์ environment จากตัวอย่าง

```bash
cp .env.example .env.local
```

บน Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

3. ตั้งค่าใน `.env.local`

```dotenv
N8N_WEBHOOK_URL="https://your-n8n-domain/webhook/it-shop-voice"
```

4. รันโปรเจกต์

```bash
npm run dev
```

เปิด `http://localhost:3000`

## Deploy to Vercel

### Option A: Deploy ผ่าน Vercel Dashboard (แนะนำ)

1. Push โค้ดขึ้น GitHub/GitLab/Bitbucket
2. เข้า Vercel > **Add New Project** > เลือก repo นี้
3. ตั้งค่า Environment Variable
	- Key: `N8N_WEBHOOK_URL`
	- Value: URL webhook ของ n8n
4. กด Deploy

### Option B: Deploy ผ่าน Vercel CLI

```bash
npm i -g vercel
vercel
```

ตั้งค่า environment บน Vercel project:

```bash
vercel env add N8N_WEBHOOK_URL production
vercel env add N8N_WEBHOOK_URL preview
```

แล้ว deploy production:

```bash
vercel --prod
```

## Pre-deploy Checklist

- `npm run build` ผ่านในเครื่อง
- มีค่า `N8N_WEBHOOK_URL` ใน Vercel ทุก environment ที่ใช้งาน
- n8n webhook endpoint เปิดรับจากโดเมน Vercel แล้ว

## Runtime Notes

- API route อยู่ที่ `src/app/api/voice/route.ts`
- route ส่ง payload ไป n8n โดยมีทั้ง `transcript` และ `text` เพื่อรองรับหลาย workflow
