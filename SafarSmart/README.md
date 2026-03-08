# SafarSmart 🧳✈️

> **AI-Powered Smart Travel Planner for Pakistan** — Plan smarter journeys tailored to your budget, interests, and travel style.

SafarSmart is a full-stack travel planning application that generates intelligent, day-by-day itineraries for destinations across Pakistan. It features a React Native (Expo) mobile app, a Gradio web frontend, and a FastAPI backend powered by vector search and LLM-based itinerary generation.

---

## 📱 Screenshots

<!-- Add your app screenshots here -->

---

## ✨ Features

- **Smart Itinerary Generation** — AI-powered day-by-day travel plans with places, descriptions, maps, and images
- **Budget Planner** — Choose hotels & transport within your budget with real-time cost estimates
- **Fare Calculator** — Compare ride-hailing fares (Uber, Careem, InDrive, Bykea) between cities
- **Weather Integration** — Live weather data for your travel dates via Open-Meteo API
- **Travel Assistant Chatbot** — AI chatbot for travel advice and itinerary modifications
- **User Authentication** — Register & login with Supabase (SQLite fallback)
- **Saved Itineraries** — Save and revisit your generated travel plans
- **Multi-language Support** — English and Urdu
- **Interactive Maps** — Spot locations with coordinates on embedded maps

---

## 🏗️ Architecture

```
smart_travel/
├── SafarSmart/          # React Native / Expo mobile app (TypeScript)
│   ├── screens/         # App screens (login, signup, dashboard, itinerary, etc.)
│   ├── src/
│   │   ├── components/  # Reusable UI components (Button, Card, Input, etc.)
│   │   ├── services/    # API clients (api.ts, fareApi.ts, budgetApi.ts, etc.)
│   │   ├── context/     # React Context (AppContext for auth state)
│   │   ├── data/        # Static data (Pakistani cities, regions)
│   │   └── theme.ts     # Design system tokens
│   └── package.json
│
├── backend/             # Python FastAPI backend
│   ├── routes/          # API route handlers
│   │   ├── itinerary.py # Itinerary generation (rule-based + LLM)
│   │   ├── user.py      # Auth (register, login, profile)
│   │   ├── chatbot.py   # AI travel assistant
│   │   ├── fare.py      # Ride-hailing fare calculator
│   │   ├── budget.py    # Budget planner with hotel/transport options
│   │   └── feedback.py  # User feedback collection
│   ├── utils/           # Helper modules
│   │   ├── weather_service.py      # Open-Meteo weather API
│   │   ├── transport_calculator.py # Transport cost engine
│   │   ├── cost_optimizer.py       # Comprehensive cost breakdowns
│   │   ├── hotel_processor.py      # Hotel data processing
│   │   └── preprocessing.py        # Raw JSON → structured data
│   ├── data/            # Travel data (spots, cities, hotels, embeddings)
│   ├── vector_db/       # ChromaDB vector store
│   ├── main.py          # FastAPI app entrypoint
│   ├── config.py        # LLM client config (Groq, OpenAI)
│   ├── retrieval.py     # Vector search for spots & hotels
│   ├── llm_itinerary.py # LLM-powered itinerary generation
│   ├── schemas.py       # Pydantic request/response models
│   ├── supabase_client.py # Supabase DB client
│   ├── local_auth.py    # SQLite auth fallback
│   └── requirements.txt
│
└── frontend/            # Gradio web UI
    └── gradio_app.py
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **Expo Go** app on your phone (for mobile testing)

### 1. Backend Setup

```bash
cd backend

# (Recommended) Create a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create/edit `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Optional — for AI-powered itineraries
GROQ_API_KEY=your-groq-key       # Free at https://console.groq.com
OPENAI_API_KEY=your-openai-key   # Optional fallback
```

### 3. Generate Embeddings (first time only)

```bash
cd backend
python utils/preprocessing.py      # Process raw JSON data
python generate_embeddings.py       # Generate spot embeddings
python utils/hotel_processor.py     # Process hotel data
python load_embeddings.py           # Load into ChromaDB
```

> **Note:** Pre-generated embeddings are included in the repo. You only need to run these if you add new data.

### 4. Start the Backend

```bash
cd backend
python run_server.py
# → API running at http://localhost:8000
# → Swagger docs at http://localhost:8000/docs
```

ngrok http 8000
### 5. Start the Mobile App

```bash
cd SafarSmart
npm install
npx expo start --tunnel

# Scan QR code with Expo Go on your phone
```

### 6. (Optional) Start the Web Frontend

```bash
cd frontend
pip install gradio
python gradio_app.py
# → Web UI at http://localhost:7860
```

---

## 📱 Mobile App — Physical Device Setup

When testing on a physical device, the app needs to reach your backend via a tunnel:

```bash
# Terminal 1: Backend
cd backend && python run_server.py

# Terminal 2: ngrok tunnel for backend
ngrok http 8000
# Copy the https://xxxx.ngrok-free.app URL

# Terminal 3: Expo
cd SafarSmart && npx expo start --tunnel
```

Then update the ngrok URL in `SafarSmart/src/services/apiConfig.ts`:

```ts
const NGROK_URL = 'https://your-ngrok-url.ngrok-free.app';
```

---

## 🔌 API Endpoints

| Method | Endpoint                    | Description                    |
| ------ | --------------------------- | ------------------------------ |
| POST   | `/user/register`            | Register a new user            |
| POST   | `/user/login`               | Login                          |
| GET    | `/user/profile`             | Get profile (auth required)    |
| POST   | `/itinerary/itinerary/generate` | Generate travel itinerary  |
| POST   | `/chatbot/chat`             | Chat with travel assistant     |
| POST   | `/fare/calculate`           | Calculate ride-hailing fares   |
| POST   | `/budget/calculate`         | Calculate trip budget           |
| POST   | `/api/budget/options`       | Get hotel & transport options  |
| POST   | `/api/budget/estimate`      | Get cost estimate              |
| POST   | `/feedback/submit`          | Submit feedback                |
| GET    | `/feedback/summary`         | Get feedback summary           |

Full interactive docs: **http://localhost:8000/docs**

---

## 🛠️ Tech Stack

| Layer      | Technology                                           |
| ---------- | ---------------------------------------------------- |
| Mobile App | React Native, Expo, TypeScript                       |
| Web UI     | Gradio (Python)                                      |
| Backend    | FastAPI, Uvicorn                                     |
| Database   | Supabase (PostgreSQL) + SQLite fallback              |
| Vector DB  | ChromaDB with sentence-transformers embeddings       |
| LLM        | Groq (Llama 3.3 70B) / OpenAI (GPT-4o-mini)         |
| Weather    | Open-Meteo API (free, no key required)               |
| Auth       | JWT (PyJWT) + bcrypt                                 |

---

## 📁 Data Sources

Travel data for all major regions of Pakistan:

- Azad Jammu & Kashmir (AJK)
- Balochistan
- Gilgit-Baltistan
- Islamabad Capital Territory
- Khyber Pakhtunkhwa (KPK)
- Punjab
- Sindh

Each region includes tourist spots, cities, hotels (budget/mid/luxury tiers), coordinates, descriptions, and images.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is for educational and demonstration purposes.
