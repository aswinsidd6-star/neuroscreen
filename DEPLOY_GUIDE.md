# NeuroScreen — Deployment Guide
## Complete step-by-step for beginners

---

## What you're building
- **yoursite.vercel.app** → Patient takes the screening test
- **yoursite.vercel.app/doctor** → Doctor logs in to see all results
- **Supabase** → Free database stores every patient's results

---

## STEP 1 — Set up Supabase (free database) ~5 minutes

1. Go to **supabase.com** → click "Start your project"
2. Sign up with your GitHub account
3. Click **"New Project"**
   - Name: `neuroscreen`
   - Database password: choose something (save it!)
   - Region: pick closest to you
4. Wait ~2 minutes for it to set up
5. Click **"SQL Editor"** in the left sidebar
6. Click **"New Query"**
7. Copy everything from `SUPABASE_SETUP.sql` and paste it → click **Run**
8. Now go to **Project Settings → API**
9. Copy these two values (you'll need them soon):
   - **Project URL** (looks like: https://abc123.supabase.co)
   - **anon public key** (long string starting with "eyJ...")

---

## STEP 2 — Push code to GitHub ~3 minutes

You already have a GitHub account. Do this:

1. Go to **github.com** → click the **+** button → "New repository"
2. Name it: `neuroscreen`
3. Leave everything else as default → click "Create repository"
4. Open your computer's terminal (or Command Prompt on Windows)
5. Run these commands one by one:

```bash
cd /path/to/neuroscreen        # navigate to this folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/neuroscreen.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## STEP 3 — Deploy to Vercel (free hosting) ~3 minutes

1. Go to **vercel.com** → you already have an account, log in
2. Click **"Add New Project"**
3. You'll see your GitHub repos — click **Import** next to `neuroscreen`
4. Framework will be detected as **Next.js** automatically ✅
5. Before clicking Deploy, click **"Environment Variables"**
6. Add these 4 variables one by one:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |
| `ANTHROPIC_API_KEY` | your Anthropic API key (from console.anthropic.com) |
| `DOCTOR_PASSWORD` | choose any password for the doctor login |

7. Click **Deploy**
8. Wait ~2 minutes → you get a live URL like `neuroscreen.vercel.app` 🎉

---

## STEP 4 — Test it

1. Visit `yoururl.vercel.app` → take the patient test
2. Visit `yoururl.vercel.app/doctor` → log in with your DOCTOR_PASSWORD
3. You should see the patient result appear in the dashboard!

---

## Your URLs
- **Patient test:** `https://neuroscreen.vercel.app`
- **Doctor login:** `https://neuroscreen.vercel.app/doctor`
- **Doctor dashboard:** `https://neuroscreen.vercel.app/doctor/dashboard`

---

## Cost breakdown
| Service | Cost |
|---------|------|
| Vercel hosting | FREE |
| Supabase database | FREE (up to 50,000 rows) |
| Anthropic API | ~$0.01 per patient (very cheap) |
| Custom domain (optional) | ~₹800/year from Porkbun |

---

## Get your Anthropic API key
1. Go to **console.anthropic.com**
2. Sign up / log in
3. Click **"API Keys"** → "Create Key"
4. Copy the key → paste it as `ANTHROPIC_API_KEY` in Vercel

---

## Changing the doctor password
1. Go to **vercel.com** → your project → Settings → Environment Variables
2. Edit `DOCTOR_PASSWORD` → save
3. Click **Redeploy** (top of Deployments page)

---

## Need help?
Ask Claude! Just share any error message you see and it can help debug it.
