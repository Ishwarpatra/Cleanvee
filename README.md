# Cleanvee — Facility Management Command Center

**Cleanvee** is a comprehensive facility management platform combining **AI-powered quality verification**, **real-time SLA monitoring**, and **mobile-first operations** for professional cleaning services. This version incorporates significant improvements in authentication, state management, and data persistence, addressing critical feedback from the product team.

[![CI](https://github.com/Ishwarpatra/Cleanvee/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Ishwarpatra/Cleanvee/actions/workflows/ci-cd.yml)

---

## 🎯 Overview

Cleanvee transforms facility management with:

- **AI-Powered Quality Verification**: Gemini 3.5 analyzes photos to verify cleaning standards
- **Robust Real-Time Data Layer**: `useFirestoreData` hook with real-time listeners, exponential backoff, and debounced updates to prevent memory leaks.
- **Enhanced State Management**: Centralized `AppContext` and `useReducer` for predictable state transitions, replacing fragmented `useState` calls.
- **Secure Authentication System**: `useAuth` hook with Firebase Auth integration, demo mode fallback, and role-based access control. Auth flash race conditions have been mitigated.
- **Persistent Settings**: `SettingsContext` now uses a dual-layer persistence strategy (localStorage + Firestore) with timestamp-based conflict resolution and a demo mode guard to prevent unnecessary Firestore writes.
- **Dynamic Theme Management**: `ThemeContext` provides full dark mode functionality, saving preferences to localStorage and respecting system preferences, with future plans for Firestore sync.
- **Role-Based Access Control**: Sidebar navigation and UI elements are dynamically filtered based on user roles (Cleaner, Manager, Admin).
- **Improved Navigation**: Header building dropdown now syncs with global app state, and a mobile-responsive sidebar with a hamburger menu has been implemented.
- **Offline-First Mobile**: Flutter app with NFC scanning and offline sync (planned for future development).
- **Privacy-First Design**: PII filtering before AI processing, comprehensive audit logs
- **Enterprise-Grade Infrastructure**: Firebase Firestore, Cloud Functions, Cloud Storage
- **Demo Mode**: Works without Firebase — perfect for testing and development, with clear indicators and explicit role selection.

**Works in demo mode without any Firebase configuration** — the app automatically falls back to mock data when environment variables are not set. Demo mode now includes an explicit role selector for easier testing.

---

## 📋 Table of Contents

- [Forensics Proof of Concept](#forensics-proof-of-concept)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)

---

## Forensics Proof of Concept

This repository also contains an offline-first, rule-based implementation of the supplied **Multi-Agent Autonomous Cyber-Forensics** proof of concept under [`forensics_poc/`](forensics_poc/). It provides validated evidence contracts, concurrent specialist analysis, evidence fusion, conservative coordination, audit-ledger verification, reports, an API, tests, and hardened operational prompts. It is intentionally isolated from the Cleanvee facility-management application and is documented in its own [README](forensics_poc/README.md).

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm 9+
- **Firebase CLI** (optional, for backend deployment)
- **Flutter SDK** 3.0+ (optional, for mobile app)

### Web App (5 minutes)

```bash
# Clone repository
git clone https://github.com/Ishwarpatra/Cleanvee.git
cd Cleanvee

# Install dependencies
npm install

# Start development server (demo mode)
npm run dev

# Visit http://localhost:5173
# Demo credentials: Use any email/password, select role from dropdown.
```

### Mobile App (10 minutes)

```bash
cd mobile_app
flutter pub get
flutter run -d chrome  # Web
flutter run -d android # Android
flutter run -d ios     # iOS
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Cleanvee Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   Web App        │  │   Mobile App     │                 │
│  │  (React/TS)      │  │  (Flutter)       │                 │
│  │  - Dashboard     │  │  - NFC Scanning  │                 │
│  │  - Team Mgmt     │  │  - Photo Capture │                 │
│  │  - Reports       │  │  - Offline Sync  │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                      │                            │
│           └──────────┬───────────┘                            │
│                      │ REST/Firestore                        │
│           ┌──────────▼──────────┐                            │
│           │   Firebase Backend  │                            │
│           ├─────────────────────┤                            │
│           │ • Firestore (DB)    │                            │
│           │ • Cloud Functions   │                            │
│           │ • Cloud Storage     │                            │
│           │ • Auth              │                            │
│           └──────────┬──────────┘                            │
│                      │                                        │
│           ┌──────────▼──────────┐                            │
│           │  External Services  │                            │
│           ├─────────────────────┤                            │
│           │ • Gemini 3.5 (AI)   │                            │
│           │ • SendGrid (Email)  │                            │
│           │ • Twilio (SMS)      │                            │
│           └─────────────────────┘                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

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

---

## ✨ Features

### Web Dashboard

| Feature | Description | Role |
|---------|-------------|------|
| **Real-Time Dashboard** | Live checkpoint status, SLA metrics, team activity with optimized data fetching | All |
| **Building Management** | CRUD operations, SLA configuration, floor plans | Manager+ |
| **Team Management** | Add/edit staff, role assignment, performance tracking | Manager+ |
| **AI Reports** | Shift summaries, quality insights, anomaly detection | Manager+ |
| **Settings** | System configuration, notification preferences with robust persistence and conflict resolution | Manager+ |
| **Offline Support** | Works without internet, syncs when online | All |
| **Responsive Layout** | Optimized for desktop and mobile devices with a new mobile navigation menu | All |

### Mobile App

| Feature | Description |
|---------|-------------|
| **NFC Scanning** | Tap to verify checkpoint cleaning |
| **Photo Capture** | AI-verified photo submission |
| **Offline Logs** | Queue logs offline, auto-sync when online |
| **Real-Time Sync** | Bi-directional sync with cloud |
| **Role-Based UI** | Different interfaces for Cleaner/Manager/Admin |

### Backend Services

| Service | Purpose |
|---------|---------|
| **AI Quality Verification** | Gemini analyzes photos for cleaning quality |
| **SLA Monitoring** | Cloud Functions check intervals, trigger alerts |
| **Notification Engine** | Email/SMS alerts for SLA breaches |
| **Privacy Filter** | Removes PII before AI processing |
| **Audit Logging** | Tracks all data access and modifications |

---

## 📁 Project Structure

```
Cleanvee/
├── App.tsx                        # Root component (routing, layout)
├── types.ts                       # All TypeScript interfaces and enums
├── constants.tsx                  # Mock data and building definitions
├── components/
│   ├── DashboardGrid.tsx          # Room status grid view
│   ├── FloorPlan.tsx              # Interactive floor plan
│   ├── Header.tsx                 # Top navigation bar
│   ├── LogFeed.tsx                # Real-time cleaning log feed
│   ├── ReportModal.tsx            # AI shift report modal
│   ├── SettingsView.tsx           # Persistent settings panel
│   ├── Sidebar.tsx                # Navigation sidebar (role-based)
│   ├── StatsOverview.tsx          # KPI stats cards
│   ├── TeamView.tsx               # Team management (CRUD)
│   ├── BuildingsView.tsx          # Building management (CRUD)
│   ├── LoginScreen.tsx            # Firebase Auth UI
│   ├── modals/                    # Modal components
│   └── ui/
│       ├── ErrorBoundary.tsx      # React error boundary
│       ├── DemoModeBanner.tsx     # Demo mode indicator
│       ├── Modal.tsx              # Base modal
│       ├── NotificationDropdown.tsx
│       └── ProfileDropdown.tsx
├── src/
│   ├── contexts/
│   │   ├── AppContext.tsx         # Global app state (useReducer)
│   │   ├── SettingsContext.tsx    # Persistent settings
│   │   └── ThemeContext.tsx       # Dark/light mode
│   ├── hooks/
│   │   ├── useFirestoreData.ts    # Real-time data + mock fallback
│   │   └── useAuth.ts             # Authentication state + RBAC
│   └── test/
│       ├── setup.ts               # Test setup
│       └── types.test.ts          # Type validation tests
├── services/
│   ├── geminiService.ts           # Gemini AI integration
│   ├── mcpServer.ts               # MCP data privacy layer
│   └── privacy/                   # PII filtering
├── functions/
│   └── src/
│       ├── index.ts               # Cloud Functions entry
│       ├── analytics.ts           # BigQuery streaming
│       └── slaMonitor.ts          # SLA watchdog
├── firestore.rules                # Security rules (role-based)
├── firestore.indexes.json         # Composite indexes
├── firebase.emulator.config.json  # Emulator configuration
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # GitHub Actions CI/CD pipeline
├── mobile_app/                    # Flutter mobile application
│   ├── lib/
│   │   ├── main.dart              # App entry point
│   │   ├── screens/               # Flutter screens
│   │   ├── providers/             # State management
│   │   └── models/                # Data models
│   └── pubspec.yaml               # Flutter dependencies
└── README.md                      # This file
```

---

## 🛠️ Setup Instructions

### 1. Web App Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 2. Firebase Project Setup (Optional)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init

# Select features:
# ✓ Firestore
# ✓ Functions
# ✓ Storage
# ✓ Hosting
# ✓ Emulators

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Start emulator for local development
firebase emulators:start --config firebase.emulator.config.json
```

### 3. Environment Configuration

Create `.env.local`:

```env
# Firebase (optional — app works without this)
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Gemini AI (optional)
VITE_GEMINI_API_KEY=your-gemini-key
```

### 4. Mobile App Installation

```bash
cd mobile_app

# Install dependencies
flutter pub get

# Run on web
flutter run -d chrome

# Run on Android
flutter run -d android

# Run on iOS
flutter run -d ios
```

### 5. Deploy to Production

```bash
# Build web app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

---

## 👨‍💻 Development

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Cloud Function tests
cd functions && npm test
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

### Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

---

## 🚀 Deployment

### GitHub Actions CI/CD

The project includes automated CI/CD via `.github/workflows/ci-cd.yml`:

- **Lint & Type Check**: Runs on every PR
- **Unit Tests**: Validates functionality
- **Security Scan**: Snyk vulnerability scanning
- **Auto Deploy**: Deploys to Firebase on main branch merge

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
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON |

### Manual Deployment

```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy all services
firebase deploy

# View deployment logs
firebase functions:log
```

---

## 🔐 Security

### Authentication

- **Firebase Auth** with email/password
- **Role-Based Access Control** (RBAC) with improved demo mode role selection
- **JWT tokens** for API requests
- **Session management** with auto-logout

### Data Privacy

- **PII Filtering** before AI processing
- **Firestore Security Rules** for row-level access control
- **Comprehensive Audit Logs** for all data access and modifications

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more details.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
