# qrPass: Digital Identity Ecosystem (Web Profile & CRM)

A high-performance "Digital Identity" platform built with Next.js, featuring a public-facing virtual business card and a private CRM for connection management.

## 🚀 Key Features

*   **Virtual Business Card:** Responsive profile with integrated vCard generation and LinkedIn/Substack support.
*   **Dual-View Interface:** Smooth manual and orientation-based transitions between a vertical profile and a horizontal business card.
*   **Professional CV Engine:** Collapsible, standardized sections for Core Achievements, Clinical Research (PubMed/DOI), and Technical Projects.
*   **Clinical Integration Portfolio:** Dedicated QI/PDSA project tracking for healthcare professionals.
*   **Activity Ledger & CRM:** Automated "Ghost Scans" and handshake logging to track interactions and manage connection intelligence.
*   **Custom Branding:** Premium themes (Minimal, Bold, Midnight) and selectable typography.

---

## 📅 Recent Updates (March 2026)

### 🧩 Feature: Clinical Integration Portfolio
*   **Dashboard Integration:** Added a new management section for QI (Quality Improvement) projects.
*   **Data Structure:** Implemented support for Title, Problem Statement, Intervention (PDSA), Metric, and Result/Outcome.
*   **Live Rendering:** Real-time synchronization between the dashboard and the public profile.

### 🎨 UI: Standardized & Collapsible CV
*   **Architecture:** Refactored all CV-related sections into a unified `<details>` system.
*   **UX Improvement:** Drastically reduced vertical height on mobile by making Core Achievements and Portfolios collapsible.
*   **Consistency:** Standardized padding, typography, and spacing across all professional experience blocks.

### 🌐 Social: LinkedIn & Substack Integration
*   **Identity Expansion:** Added dedicated data fields for LinkedIn and Substack URLs.
*   **Branded Buttons:** High-visibility social graph buttons added to the primary CTA row.
*   **vCard Support:** Integrated social profiles into the downloadable contact card.

### 📱 Interface: Advanced View Transition
*   **Refactor:** Migrated profile rendering to a `ProfileView` client component for enhanced interactivity.
*   **Manual Toggle:** Added a floating action button to manually switch between Vertical and Horizontal views on any device.
*   **Orientation Intelligence:** Fixed overlapping logic in landscape mode to ensure the business card correctly swaps with the profile view.

---

## 🛠 Tech Stack
*   **Framework:** Next.js (App Router, TypeScript)
*   **Styling:** Tailwind CSS
*   **Backend:** Firebase (Firestore, Auth, Storage)
*   **API Integrations:** GitHub (Repos), PubMed (E-utils), CrossRef (DOI)
*   **State Management:** React Hooks + Firestore Real-time Sync

## 🚦 Getting Started

1.  **Install dependencies:** `npm install`
2.  **Run development server:** `npm run dev`
3.  **Build for production:** `npm run build`
