# 🔥 DeadlineMe

**Put your money where your goals are.**

DeadlineMe is an AI-powered accountability app that charges you real money when you miss your deadlines. Set a goal, stake cash, and if you fail — your money goes to a cause you hate.

## How It Works

1. **Set a goal** with a specific deadline
2. **Stake real money** ($1–$500) on it
3. **AI verifies** your proof of completion
4. ✅ **Hit it?** Get your money back
5. ❌ **Miss it?** Your money goes to an anti-charity you chose

## What's Built

### Core Stake Engine
- Create a stake with title, category, deadline, and amount
- Stripe payment sheet authorizes funds at creation (manual capture)
- Deadline checker runs every 60 seconds — auto-fails expired stakes
- Upload proof image → OpenAI Vision verifies completion → refund or forfeit
- Cancel within 60 minutes: full refund. After 60 minutes: 50% forfeit

### Social / Groups
- Create or join accountability squads with invite codes
- Operational log shows squad activity in real time
- Group Challenges — create shared goals, everyone stakes to join, AI verifies individually
- Challenges auto-expire, organized into Active / Results / Expired sections
- Admin controls: remove members, transfer admin, delete group
- Any member can leave at any time

### Profiles & Stats
- Unique `@username` set on first login
- Live stats: hit rate, total staked, saved, lost, streak
- Squad integrity score across group members

### Payments
- Stripe payment sheet (test mode, ready for live)
- Manual capture — funds held until deadline resolves
- Platform fee: 5% on forfeitures
- Full payment history on profile

### AI Verification
- OpenAI Vision (gpt-4o-mini) analyzes proof images
- Returns verified/confidence/reasoning
- Flags ambiguous proofs for manual review

### Landing Page
- Live at [deadline-me.vercel.app](https://deadline-me.vercel.app)
- Email waitlist saves to Supabase

## Tech Stack

### Mobile
- React Native + Expo SDK 54
- React Navigation v6 (stack + bottom tabs)
- Stripe React Native SDK
- Supabase JS (auth + SecureStore)
- Expo Image Picker, Expo Notifications

### Backend
- FastAPI + Python 3.11
- Supabase (PostgreSQL + Auth + Storage)
- Stripe (payments, refunds, manual capture)
- OpenAI Vision API
- Asyncio background loop (deadline checker, every 60s)
- Docker + Railway

### Infrastructure
- Backend: Railway (auto-deploy from GitHub)
- Landing page: Vercel (auto-deploy from GitHub)
- Database: Supabase (PostgreSQL, RLS enabled)
- Storage: Supabase Storage (proof images)

## Project Structure

```
deadlineme/
├── mobile/                        # React Native + Expo
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── screens/
│       │   ├── SplashScreen.js        # SVG logo, onboarding
│       │   ├── SignInScreen.js
│       │   ├── SignUpScreen.js
│       │   ├── UsernameScreen.js      # First-login username setup
│       │   ├── DashboardScreen.js     # Live countdown stakes
│       │   ├── NewStakeScreen.js      # 4-step stake creation + Stripe
│       │   ├── StakeDetailScreen.js   # Cancel, upload proof
│       │   ├── ProofScreen.js         # AI verification + share card
│       │   ├── StatsScreen.js         # History + survival rate
│       │   ├── ProfileScreen.js       # Stats + financial audit
│       │   ├── GroupsScreen.js        # Squad list + join modal
│       │   ├── GroupDetailScreen.js   # Mission control + admin tools
│       │   ├── CreateGroupScreen.js
│       │   ├── GroupChallengesScreen.js
│       │   ├── CreateChallengeScreen.js
│       │   └── ChallengeDetailScreen.js
│       ├── navigation/
│       │   └── RootNavigator.js       # Auth + App stacks, bottom tabs
│       ├── hooks/
│       │   └── useAuth.js             # Supabase auth context
│       ├── services/
│       │   ├── api.js                 # All backend API calls
│       │   └── supabase.js            # Supabase client + SecureStore
│       └── utils/
│           └── theme.js               # Design system, colors, categories
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app + deadline checker loop
│   │   ├── api/
│   │   │   ├── stakes.py              # Stake CRUD, cancel, proof upload
│   │   │   ├── payments.py            # Stripe payment sheet + webhooks
│   │   │   ├── users.py               # Profile, stats, username check
│   │   │   ├── groups.py              # Groups, members, admin controls
│   │   │   └── challenges.py          # Group challenges + join with stake
│   │   ├── core/
│   │   │   ├── config.py              # Pydantic settings
│   │   │   └── deps.py                # Auth dependency, Supabase client
│   │   ├── schemas/
│   │   │   └── schemas.py             # Pydantic request/response models
│   │   └── services/
│   │       ├── stripe_service.py      # Capture, refund, cancel
│   │       ├── ai_verification.py     # OpenAI Vision proof check
│   │       └── deadline_checker.py    # Expire stakes, capture funds
│   ├── requirements.txt
│   └── Dockerfile
└── landing/                           # Vercel landing page
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | Extends auth.users — username, stats, Stripe customer ID |
| `stakes` | Core table — goal, amount, deadline, status, Stripe intent ID |
| `groups` | Accountability squads with invite codes |
| `group_members` | Members with admin/member roles |
| `group_events` | Activity feed — stake created/completed/failed, member joined |
| `group_challenges` | Shared goals with deadline and min stake |
| `challenge_participants` | Who joined each challenge, their stake and status |
| `waitlist` | Landing page email signups |

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Expo CLI: `npm install -g expo-cli`
- Supabase account + project
- Stripe account (test keys)
- OpenAI API key

### Mobile

```bash
cd mobile
npm install
cp .env.example .env   # Add your keys
npx expo start --tunnel --clear
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Add your keys
uvicorn app.main:app --reload
```

## Environment Variables

**Backend `.env`**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
APP_SECRET_KEY=
APP_ENV=development
```

**Mobile `.env`**
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_API_URL=http://localhost:8000
```

## Deployment

- **Backend:** Railway — root directory `/backend`, auto-deploys from `main`
- **Landing page:** Vercel — root directory `/landing`, auto-deploys from `main`
- **Database:** Supabase (managed Postgres)

## Monetization

- **Free tier:** 1 active stake at a time
- **Pro ($7.99/mo):** Unlimited stakes, AI check-ins, streak tracking, analytics
- **Transaction fee:** 5% on all forfeitures

## Roadmap

- [x] Auth (Supabase email + username onboarding)
- [x] Create / view / cancel stakes
- [x] Stripe payment sheet (test mode)
- [x] AI proof verification (OpenAI Vision)
- [x] Auto-expire deadlines (background loop)
- [x] Share card on completion
- [x] Streak tracking + stats
- [x] Group accountability squads
- [x] Group challenges with individual stakes
- [x] Admin controls (remove member, delete group, transfer admin)
- [x] Landing page + waitlist
- [ ] Push notifications (requires EAS Build)
- [ ] Pro tier paywall ($7.99/mo)
- [ ] Stripe live mode
- [ ] App Store / TestFlight

## Author

Bilal Athar — [@batharr41](https://github.com/batharr41)
