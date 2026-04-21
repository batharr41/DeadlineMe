# 🔥 DeadlineMe

**Put your money where your goals are.**

DeadlineMe is an AI-powered accountability app that charges you real money when you miss your deadlines. Set a goal, stake cash, and if you fail — your money goes to a cause you hate.

## How It Works

1. **Set a goal** with a specific deadline
2. **Stake real money** ($5–$50) on it
3. **AI checks in** with reminders before your deadline
4. **Upload proof** (screenshot, photo, link) when you're done
5. **AI verifies** your completion
6. ✅ **Hit it?** Get your money back
7. ❌ **Miss it?** Your money goes to an anti-charity you chose

## Tech Stack

### Mobile (React Native + Expo)
- **Framework:** React Native with Expo SDK 52
- **Navigation:** React Navigation v6
- **State:** React Context + hooks
- **Notifications:** Expo Notifications
- **Payments:** Stripe React Native SDK

### Backend (Python + FastAPI)
- **Framework:** FastAPI
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email, Google, Apple)
- **Payments:** Stripe Connect
- **AI Verification:** OpenAI Vision API
- **Task Queue:** Celery + Redis (for deadline checks)
- **Hosting:** Railway / Render

## Project Structure

```
deadlineme/
├── mobile/                  # React Native + Expo app
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── screens/         # App screens
│       ├── components/      # Reusable UI components
│       ├── navigation/      # React Navigation setup
│       ├── hooks/           # Custom hooks
│       ├── services/        # API client, Supabase, Stripe
│       ├── utils/           # Helpers, constants, theme
│       └── assets/          # Images, fonts
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py          # FastAPI app entry
│   │   ├── api/             # Route handlers
│   │   ├── core/            # Config, security, deps
│   │   ├── models/          # SQLAlchemy / Supabase models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Business logic (Stripe, AI, etc.)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── tests/
├── docs/                    # Documentation
├── .gitignore
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Stripe account
- OpenAI API key

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your keys
uvicorn app.main:app --reload
```

## Environment Variables

See `.env.example` for all required variables.

## Monetization

- **Free tier:** 1 active stake at a time
- **Pro ($7.99/mo):** Unlimited stakes, AI check-ins, streak tracking, analytics
- **Transaction fee:** 5% on all stakes (covers Stripe fees + margin)

## Roadmap

- [x] Project scaffolding
- [ ] Auth (Supabase email + social)
- [ ] Create / view stakes
- [ ] Stripe payment integration
- [ ] AI proof verification (OpenAI Vision)
- [ ] Push notification check-ins
- [ ] Anti-charity selection & donation routing
- [ ] Streak tracking & stats
- [ ] Social sharing / friend challenges
- [ ] Landing page & waitlist

## License

MIT

## Author

Bilal — [@your-handle](https://github.com/your-handle)
