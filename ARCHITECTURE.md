# Cleanvee Architecture Documentation

This document describes the system design, data models, and technical decisions behind Cleanvee.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Models](#data-models)
3. [Component Architecture](#component-architecture)
4. [State Management](#state-management)
5. [Authentication & Authorization](#authentication--authorization)
6. [Backend Services](#backend-services)
7. [API Design](#api-design)
8. [Security Model](#security-model)
9. [Performance Considerations](#performance-considerations)
10. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────── ──────┐
│                        Client Layer                          │
├──────────────────────────────────────────────────── ─────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │   Web Browser    │  │   Mobile App     │                  │
│  │  (React/TS)      │  │  (Flutter)       │                  │
│  │  - Dashboard     │  │  - NFC Scanning  │                  │
│  │  - Reports       │  │  - Photo Capture │                  │
│  │  - Settings      │  │  - Offline Sync  │                  │
│  └────────┬─────────┘  └────────┬─────────┘                  │
│           │                      │                           │
├───────────┴──────────────────────┴──────────────────────── ──┤
│                    Network Layer (REST/WebSocket)            │
├────────────────────────────────────────────────────── ───────┤
│                                                              │
│           ┌──────────────────────────────┐                   │
│           │   Firebase Backend           │                   │
│           ├──────────────────────────────┤                   │
│           │ • Firestore (Real-time DB)   │                   │
│           │ • Cloud Functions            │                   │
│           │ • Cloud Storage              │                   │
│           │ • Authentication             │                   │
│           │ • Cloud Messaging            │                   │
│           └──────────────────────────────┘                   │
│                      │                                       │
├──────────────────────┴───────────────────────────────────────┤
│                  External Services Layer                     │
├────────────────────────────────────────────────────────── ───┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Gemini 3.5   │  │ SendGrid     │  │ Twilio       │        │
│  │ (AI Analysis)│  │ (Email)      │  │ (SMS)        │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────── ──┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI framework |
| **State Management** | Context API + useReducer | Global state |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Mobile** | Flutter 3.0+ | Cross-platform mobile |
| **Backend** | Firebase | BaaS platform |
| **Database** | Firestore | Real-time document DB |
| **Functions** | Cloud Functions | Serverless compute |
| **Storage** | Cloud Storage | File storage |
| **Auth** | Firebase Auth | Authentication |
| **AI** | Google Gemini 3.5 | Vision analysis |
| **CI/CD** | GitHub Actions | Automated deployment |

---

## Data Models

### Core Entities

#### Building
```typescript
interface Building {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  client_sla_config: {
    required_cleanings_per_day: number;
    cleaning_window_start: string;
    cleaning_window_end: string;
    max_cleaning_interval_hours: number;
    grace_period_minutes: number;
  };
  floor_plan_url?: string;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

#### Checkpoint
```typescript
interface Checkpoint {
  id: string;
  building_id: string;
  name: string;
  location: string;
  nfc_tag_id?: string;
  required_frequency: "hourly" | "daily" | "weekly";
  last_cleaned?: Timestamp;
  current_status: "clean" | "dirty" | "pending" | "overdue";
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

#### CleaningLog
```typescript
interface CleaningLog {
  id: string;
  checkpoint_id: string;
  building_id: string;
  worker_id: string;
  timestamp: Timestamp;
  photo_url?: string;
  verification_result?: {
    score: number;
    status: "verified" | "rejected";
    reason?: string;
    ai_feedback?: string;
  };
  status: "pending" | "verified" | "rejected" | "appealed";
  notes?: string;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

#### User
```typescript
interface User {
  uid: string;
  email: string;
  full_name: string;
  role: "cleaner" | "manager" | "admin";
  assigned_building_ids: string[];
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

---

## Component Architecture

### Component Hierarchy

```
App
├── LoginScreen (if not authenticated)
├── Header
│   ├── NotificationDropdown
│   └── ProfileDropdown
├── Sidebar
│   ├── Navigation (role-based)
│   └── AI Insights Panel
├── Main Content Area
│   ├── DashboardView
│   │   ├── StatsOverview
│   │   ├── DashboardGrid
│   │   ├── LogFeed
│   │   └── FloorPlan
│   ├── BuildingsView
│   │   └── BuildingForm (modal)
│   ├── TeamView
│   │   └── UserForm (modal)
│   ├── SettingsView
│   │   ├── AIConfiguration
│   │   ├── NotificationSettings
│   │   └── MobileSettings
│   └── ReportModal
└── ErrorBoundary
```

---

## State Management

### Context Hierarchy

```
AppContext
├── activeTab: string
├── selectedBuilding: Building
├── selectedCheckpointId: string
├── selectedLog: CleaningLog
├── viewMode: "grid" | "map"
├── showReportModal: boolean
├── reportLoading: boolean
└── error: string | null

SettingsContext
├── settings: AppSettings
├── hasChanges: boolean
├── isSaving: boolean
├── saveError: string | null
└── updateSettings, saveSettings, resetSettings

AuthContext
├── user: AuthUser | null
├── loading: boolean
├── error: string | null
└── logout
```

---

## Authentication & Authorization

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Cleaner** | View assigned buildings, submit logs, view personal stats |
| **Manager** | View all buildings, manage team, configure SLA, view reports |
| **Admin** | Full system access, user management, system settings |

---

## Backend Services

### Cloud Functions

#### 1. SLA Monitor (`slaMonitor.ts`)
- **Trigger**: Firestore write to `cleaning_logs`
- **Logic**: Check if cleaning interval exceeds SLA threshold
- **Action**: Create alert, send notification

#### 2. Analytics (`analytics.ts`)
- **Trigger**: Scheduled (daily)
- **Logic**: Aggregate cleaning logs, compute statistics
- **Action**: Write to BigQuery, update `daily_stats` collection

#### 3. Notification Service
- **Trigger**: Alert creation
- **Logic**: Format message, select channel (email/SMS)
- **Action**: Send via SendGrid/Twilio

---

## Security Model

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own profile
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId && isManager();
    }
    
    // Managers can read team data
    match /users/{userId} {
      allow read: if isManager();
    }
    
    // Cleaners can read assigned buildings
    match /buildings/{buildingId} {
      allow read: if canAccessBuilding(buildingId);
    }
    
    // Cleaners can submit logs to assigned buildings
    match /cleaning_logs/{logId} {
      allow create: if canAccessBuilding(resource.data.building_id);
      allow read: if canAccessBuilding(resource.data.building_id);
    }
    
    // Admins have full access
    match /{document=**} {
      allow read, write: if isAdmin();
    }
  }
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Real-Time Listeners**: Firestore listeners only on visible data
2. **Pagination**: LogFeed paginates results (50 items per page)
3. **Caching**: Settings cached in localStorage
4. **Lazy Loading**: Components load data on demand
5. **Debouncing**: Search and filter inputs debounced

### Firestore Indexes

```
Composite indexes:
- building_id + timestamp (cleaning_logs)
- building_id + status (cleaning_logs)
- worker_id + timestamp (cleaning_logs)
- checkpoint_id + timestamp (cleaning_logs)
```

---

## Deployment Architecture

### Development Environment

```
Local Machine
├── npm run dev (Vite dev server on :5173)
├── Firebase Emulator (Firestore on :8080)
└── Flutter app (local device/emulator)
```

### Production Environment

```
Firebase Project (production)
├── Firestore (production data)
├── Cloud Functions (production)
├── Cloud Storage (production)
├── Hosting (cleanvee.app)
├── Cloud CDN (caching)
└── Cloud Armor (DDoS protection)
```

### CI/CD Pipeline

```
Git Push
  ↓
GitHub Actions
  ├── Lint & Type Check
  ├── Unit Tests
  ├── Security Scan
  └── Build
    ↓
  Deploy to Firebase
    ├── Hosting
    ├── Functions
    └── Rules
```

---

**Last Updated**: 2025-05-15  
**Version**: 2.0.0
