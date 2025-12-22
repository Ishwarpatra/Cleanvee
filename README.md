# VeriClean: The Janitorial Command Center

![Status](https://img.shields.io/badge/Status-Beta-blue)
![Tech](https://img.shields.io/badge/Built%20With-Flutter%20%7C%20Firebase%20%7C%20TensorFlow-02569B)
![License](https://img.shields.io/badge/License-MIT-green)

**VeriClean** is a "Control-Based" facility management system designed to replace paper logs with digital verification. By combining cryptographic proof-of-presence with edge-based computer vision, we provide facility managers with indisputable proof that work was performed to standard.

---

## 🛑 The Problem: The "Invisibility" of Cleaning
In the $78B commercial cleaning industry, work is inherently "invisible." Once a cleaner leaves a room, there is no physical evidence of their labor other than the absence of dirt. 
*   **Trust Gap:** Managers cannot physically inspect every room every day.
*   **"Pencil Whipping":** Paper logs are easily falsified, leading to broken Service Level Agreements (SLAs) and lost contracts.
*   **Subjectivity:** "Clean" is subjective. One person's "clean" is another person's "missed spot."

## 🛡️ The Solution: Trust, But Verify
VeriClean bridges the trust gap using a **Two-Factor Verification** protocol:

1.  **Proof of Presence (NFC):** 
    *   Cleaners must tap a cryptographically secure NTAG213 sticker installed at the location.
    *   This generates a `proof_of_presence` timestamp and location hash that cannot be spoofed by GPS mocking.

2.  **Proof of Quality (Edge AI):**
    *   Before a log can be submitted, the cleaner captures a photo of the area.
    *   **On-Device AI (TFLite)** analyzes the image in <200ms without internet.
    *   The AI detects hazards (spills, overflowing trash) and generates a quality score.
    *   **Green (<4h):** Compliant. **Yellow (>4h):** Warning. **Red:** Critical/Failed.

---

## 🏗️ Tech Stack

### Mobile App (The Edge)
*   **Framework:** Flutter (iOS & Android)
*   **Local Database:** Hive (NoSQL) for offline-first synchronization.
*   **Computer Vision:** TensorFlow Lite (MobileNetV2 SSD) running via `tflite_flutter` with NNAPI/CoreML delegates.
*   **Hardware:** NTAG213 NFC Integration.

### Web Dashboard (The Command Center)
*   **Frontend:** React, TypeScript, Vite, Tailwind CSS.
*   **Visualization:** Recharts for analytics, Custom Grid Layouts for Live Floor Plans.

### Backend (The Cloud)
*   **Core:** Firebase (Auth, Firestore, Storage).
*   **Compute:** Google Cloud Functions (TypeScript) for SLA monitoring and event triggers.
*   **Analytics:** Google Gemini API for automated Shift Reporting and natural language insights.

---

## 🚀 Setup Guide

### Prerequisites
*   Flutter SDK (3.x+)
*   Node.js & npm
*   Firebase CLI

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-org/vericlean.git
    cd vericlean
    ```

2.  **Mobile App Setup**
    ```bash
    cd mobile_app
    flutter pub get
    # Ensure you have an Android Emulator or iOS Simulator running
    flutter run
    ```

3.  **Dashboard Setup**
    ```bash
    cd web_dashboard
    npm install
    npm run dev
    ```

4.  **Firebase Configuration**
    *   Place your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) in the respective Flutter directories.
    *   Set up your `.env` file with `VITE_FIREBASE_API_KEY` for the web dashboard.

## 📱 Offline-First Architecture
VeriClean utilizes a "Store-and-Forward" architecture. 
1.  **Download:** When online, the app downloads a "Manifest" of Model Weights and Reference Images.
2.  **Verify:** The app functions 100% offline, storing logs in a local Hive queue.
3.  **Sync:** A background WorkManager job uploads logs and high-res photos to Cloud Storage when connectivity is restored.

---

*Copyright © 2024 VeriClean Technologies.*
