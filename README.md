# Cleanvee — Facility Management Command Center

> AI-powered cleaning verification and compliance tracking for facility managers.

[![CI](https://github.com/Ishwarpatra/Cleanvee/actions/workflows/ci.yml/badge.svg)](https://github.com/Ishwarpatra/Cleanvee/actions/workflows/ci.yml)

---

## Overview

Cleanvee is a React + TypeScript dashboard for tracking cleaning operations across multiple buildings. It uses NFC-based proof-of-presence, AI quality scoring, and real-time Firestore data to give facility managers live compliance visibility.

**Works in demo mode without any Firebase configuration** — the app automatically falls back to mock data when environment variables are not set.

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm 9+

### 1. Clone and install
```bash
git clone https://github.com/Ishwarpatra/Cleanvee.git
cd Cleanvee
npm install
```

### 2. Configure environment (optional — app works without this)
```bash
cp .env.example .env.local
# Edit .env.local with your Firebase credentials
```

### 3. Run development server
```bash
npm run dev
# Open http://localhost:5173
```

The app runs in **demo mode** if Firebase credentials are not provided, showing realistic mock data.

---

## Project Structure

```
cleanvee/
├── App.tsx                    # Root component (routing, layout)
├── types.ts                   # All TypeScript interfaces and enums
├── constants.tsx              # Mock data and building definitions
├── components/
│   ├── DashboardGrid.tsx      # Room status grid view
│   ├── FloorPlan.tsx          # Interactive floor plan
│   ├── Header.tsx             # Top navigation bar
│   ├── LogFeed.tsx            # Real-time cleaning log feed
│   ├── ReportModal.tsx        # AI shift report modal
│   ├── SettingsView.tsx       # Persistent settings panel
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── StatsOverview.tsx      # KPI stats cards
│   ├── TeamView.tsx           # Team management
│   ├── BuildingsView.tsx      # Building management
│   ├── modals/                # Modal components
│   └── ui/
│       ├── ErrorBoundary.tsx  # React error boundary
│       ├── DemoModeBanner.tsx # Demo mode indicator
│       ├── Modal.tsx          # Base modal
│       ├── NotificationDropdown.tsx
│       └── ProfileDropdown.tsx
├── src/
│   ├── contexts/
│   │   ├── AppContext.tsx     # Global app state (useReducer)
│   │   ├── SettingsContext.tsx # Persistent settings
│   │   └── ThemeContext.tsx   # Dark/light mode
│   ├── hooks/
│   │   ├── useFirestoreData.ts # Real-time data + mock fallback
│   │   └── useAuth.ts         # Authentication state
│   └── test/
│       ├── setup.ts           # Test setup
│       └── types.test.ts      # Type validation tests
├── services/
│   ├── geminiService.ts       # Gemini AI integration
│   ├── mcpServer.ts           # MCP data privacy layer
│   └── privacy/               # PII filtering
├── functions/
│   └── src/
│       ├── index.ts           # Cloud Functions entry
│       ├── analytics.ts       # BigQuery streaming
│       └── slaMonitor.ts      # SLA watchdog
├── firestore.rules            # Security rules (role-based)
├── firestore.indexes.json     # Composite indexes
└── .github/
    └── workflows/ci.yml       # GitHub Actions CI/CD
```

---

## Architecture

### SOLID Principles Applied

| Principle | Implementation |
|-----------|---------------|
| **Single Responsibility** | Each context manages one concern; types.ts is types-only |
| **Open/Closed** | New settings fields extend `AppSettings` type without modifying `SettingsContext` |
| **Liskov Substitution** | `useFirestoreData` returns same interface whether using live or mock data |
| **Interface Segregation** | Components receive only the props they need |
| **Dependency Inversion** | Components depend on context hooks, not Firebase SDK directly |

### Data Flow

```
Firebase Firestore ──► useFirestoreData hook ──► AppContext ──► Components
       │                       │
       │              (fallback to mock data
       │               if Firebase not configured)
       │
Firebase Auth ──► useAuth hook ──► Permission helpers ──► UI visibility
```

### Settings Persistence

Settings are stored in two layers:
1. **localStorage** — instant, offline-first, survives page reload
2. **Firestore** (optional) — synced to cloud when Firebase is configured

---

## Firebase Setup (Optional)

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Firestore**, **Authentication** (Email/Password), and **Hosting**
3. Copy credentials to `.env.local`
4. Deploy security rules: `firebase deploy --only firestore:rules`
5. Deploy indexes: `firebase deploy --only firestore:indexes`

### Firestore Collections

| Collection | Description |
|------------|-------------|
| `users` | User profiles with role and building assignments |
| `buildings` | Building metadata and SLA configuration |
| `checkpoints` | NFC checkpoint locations per building |
| `cleaning_logs` | Immutable cleaning event records |
| `alerts` | SLA breach and quality alerts |
| `daily_stats` | Aggregated daily statistics |
| `app_config` | Global application settings |

---

## CI/CD

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push:

1. **TypeScript type check** — `tsc --noEmit`
2. **Build** — `vite build` with empty env vars (demo mode)
3. **Cloud Function tests** — Jest unit tests
4. **Security audit** — `npm audit --audit-level=high`
5. **Deploy** — Firebase Hosting (main branch only, requires secrets)

### Required GitHub Secrets (for deployment)

| Secret | Description |
|--------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_GEMINI_API_KEY` | Google Gemini API key |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (for deployment) |

---

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run Cloud Function tests
cd functions && npm test
```

---

## Known Limitations

- **Mobile app** (Flutter) is not yet implemented — the Dart files are stubs
- **NFC integration** requires the Flutter mobile app
- **TFLite inference** requires the Flutter mobile app
- **Push notifications** require Firebase Cloud Messaging setup
- **Gemini shift reports** require a valid `VITE_GEMINI_API_KEY`

---

## Roadmap

See [CRITICAL PATH TO MVP](docs/roadmap.md) for the prioritized implementation plan.

**Week 1 (Foundation):**
- [x] Firestore real-time listeners with mock fallback
- [x] Settings persistence (localStorage + Firestore)
- [x] TypeScript strict mode
- [x] Error boundaries on all views
- [x] CI/CD pipeline

**Week 2 (Core Features):**
- [ ] Firebase Auth login screen
- [ ] Role-based route guards
- [ ] SLA violation Cloud Function (implemented, needs deployment)
- [ ] Rejection workflow UI

**Week 3 (Mobile):**
- [ ] Flutter app skeleton
- [ ] NFC reader integration
- [ ] Offline queue with Hive

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit changes (`git commit -m 'feat: add your feature'`)
4. Push to branch (`git push origin feat/your-feature`)
5. Open a Pull Request (use the PR template)

---

## License

Private — All rights reserved.
