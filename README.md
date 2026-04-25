# 🔥 DeadlineMe

**Put your money where your goals are.**

DeadlineMe is an AI-powered accountability app that charges you real money when you miss your deadlines. Set a goal, stake cash on it, and if you fail — your money goes to a charity you care about.

## How It Works

1. **Set a goal** with a specific deadline
2. **Stake real money** ($1–$500) on it
3. **AI checks in** with reminders before your deadline
4. **Upload proof** (screenshot, photo, link) when you're done
5. **AI verifies** your completion
6. ✅ **Hit it?** Get your money back in full
7. 🤲 **Miss it?** Your loss becomes someone's gain — money goes to charity

## Tech Stack

### Mobile (React Native + Expo)
- **Framework:** React Native with Expo SDK 54
- **Navigation:** React Navigation v6 (stack + bottom tabs)
- **State:** React Context + hooks
- **Notifications:** expo-notifications (local)
- **Payments:** Stripe React Native SDK (dev mode)

### Backend (Python + FastAPI)
- **Framework:** FastAPI
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email)
- **Payments:** Stripe (dev mode placeholders)
- **AI Verification:** OpenAI Vision API (dev mode auto-approves)
- **Task Queue:** asyncio background task (deadline checker every 60s)
- **Hosting:** Railway

## Project Structure

```
deadlineme/
├── mobile/                  # React Native + Expo app
│   ├── index.js             # Entry point (SDK 54)
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── screens/
│       │   ├── SplashScreen.js
│       │   ├── SignInScreen.js
│       │   ├── SignUpScreen.js
│       │   ├── DashboardScreen.js
│       │   ├── StatsScreen.js
│       │   ├── ProfileScreen.js
│       │   ├── NewStakeScreen.js
│       │   ├── StakeDetailScreen.js
│       │   └── ProofScreen.js
│       ├── navigation/
│       │   └── RootNavigator.js
│       ├── hooks/
│       │   └── useAuth.js
│       ├── services/
│       │   ├── api.js
│       │   ├── supabase.js
│       │   └── notifications.js
│       └── utils/
│           └── theme.js
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry + deadline checker loop
│   │   ├── api/
│   │   │   ├── stakes.py
│   │   │   ├── payments.py
│   │   │   └── users.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── deps.py
│   │   ├── schemas/
│   │   │   └── schemas.py
│   │   └── services/
│   │       ├── stripe_service.py
│   │       ├── ai_verification.py
│   │       └── deadline_checker.py
│   ├── requirements.txt
│   └── Dockerfile
└── README.md
```

## Current Status

### ✅ Working End-to-End
- Email auth (Supabase, no email confirmation required)
- Create stake → DB insert → dashboard refresh
- Cancel stake (60-min grace = free refund, after = 50% forfeit)
- Deadline checker runs every 60s as asyncio background task
- Expired stakes auto-fail and move to history
- Proof upload → AI verification (dev mode auto-approves) → refund
- Local notifications (3 reminders: 24h / 1h / at deadline)
- Streaks: completed = +1, failed/emergency exit = break, grace cancel = neutral
- Bottom tabs: Home | Stats | Profile
- Stats screen: streak, success rate, money grid, category breakdown, recent history
- Profile screen: avatar, lifetime stats, sign out
- Backend deployed on Railway, mobile points at Railway URL

### ⏳ Not Yet Built
- Real Stripe payments (currently dev-mode placeholders)
- Real OpenAI Vision (currently dev-mode auto-approves all proofs)
- Charity payout pipeline (legal review needed)
- Apple Developer account + EAS Build + TestFlight
- Remote push notifications (requires EAS Build)
- Production monitoring (Sentry)

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- Stripe account
- OpenAI API key

### Mobile

```bash
cd mobile
npm install
npx expo start
```

### Backend (local dev only — production runs on Railway)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your keys
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Environment Variables

**Backend (`backend/.env`):**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
DATABASE_URL=
APP_SECRET_KEY=
```

**Mobile (`mobile/.env`):**
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=https://deadlineme-production.up.railway.app
```

## Charity System

On failure, stakes go to verified charities across 7 categories:
- 🌍 Humanitarian Aid (Doctors Without Borders, Red Cross, UNICEF, Islamic Relief USA)
- 🤲 Poverty Relief (GiveDirectly, Zakat Foundation, Penny Appeal)
- 📖 Education (Room to Read, Khan Academy, DonorsChoose)
- 🏥 Health & Medical (St. Jude, ACS, NAMI)
- 🌱 Environment (WWF, Nature Conservancy)
- 🐾 Animals (ASPCA, Best Friends)
- ✨ Surprise Me

## Monetization

- **Free tier:** 1 active stake at a time
- **Pro ($7.99/mo):** Unlimited stakes, AI check-ins, streak tracking, analytics
- **Transaction fee:** 5% on all captured stakes

## Deployment

- **Backend:** Railway (auto-deploys from `main` branch)
- **Mobile:** Expo Go for beta testing, EAS Build for App Store

## Roadmap

- [x] Auth
- [x] Create / view / cancel stakes
- [x] Deadline checker (background task)
- [x] AI proof verification
- [x] Local push notifications
- [x] Streak tracking
- [x] Stats screen + bottom tabs
- [x] Railway deployment
- [ ] Real Stripe integration
- [ ] Charity payout pipeline
- [ ] EAS Build + TestFlight
- [ ] App Store listing

## Author

Bilal Athar — [github.com/batharr41](https://github.com/batharr41)
