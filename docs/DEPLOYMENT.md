# Deployment Guide

## 🌐 Deploy on Render

### Using Blueprint (`render.yaml`)
1. Sign in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint**.
3. Select `manojreddyvantla/ATTENDANCE-TRACKER`.
4. Click **Apply**.

### Manual Web Service Setup
- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Environment Variables**:
  - `NODE_VERSION`: `20.11.0`

## ▲ Deploy on Vercel
1. Connect repository on [vercel.com](https://vercel.com).
2. Framework Preset: **Next.js**.
3. Click **Deploy**.
