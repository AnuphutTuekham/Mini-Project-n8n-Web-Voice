# Vercel Deployment Guide

## Prerequisites
- [Vercel Account](https://vercel.com/signup) (free tier is available)
- Git repository (GitHub, GitLab, or Bitbucket)
- Your n8n webhook URL

## Step 1: Push Code to Git Repository

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended for testing)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Set deployments to production
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Select your Git repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add environment variables:
   - `N8N_WEBHOOK_URL`: Your n8n webhook URL from `.env.local`
6. Click **"Deploy"**

## Step 3: Configure Environment Variables

In Vercel Dashboard:
1. Go to your project **Settings**
2. Navigate to **Environment Variables**
3. Add `N8N_WEBHOOK_URL` for Production, Preview, and Development environments

## Step 4: Verify Deployment

After deployment:
- ✅ Check the deployment URL works
- ✅ Test the voice API endpoint (POST to `/api/voice`)
- ✅ Check browser console for any errors
- ✅ Verify microphone permissions work

## Troubleshooting

**Issue: "N8N_WEBHOOK_URL is not set"**
- Add the environment variable in Vercel project settings

**Issue: CORS errors when calling n8n**
- Ensure n8n webhook is publicly accessible
- Check n8n CORS settings

**Issue: Microphone not working in deployed version**
- Your app must be served over HTTPS (Vercel provides this)
- Request microphone permission in the browser

## Useful Commands

```bash
# View deployment logs
vercel logs

# Redeploy last commit
vercel --prod

# Preview URL (staging)
vercel

# List all deployments
vercel list
```

## Key Files Ready for Deployment
- ✅ `.env.example` - Environment variables documentation
- ✅ `vercel.json` - Vercel configuration
- ✅ `.gitignore` - Updated to exclude .env files
- ✅ Build verified - No compilation errors

## Support
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [n8n Webhook Documentation](https://docs.n8n.io/workflows/triggers/webhook/)
