# 💍 Ecosystem Sync Platform for Smart Rings & Wearables

An offline-first, battery-efficient, multi-tier synchronization platform designed for smart rings and continuous health-monitoring wearables.

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green?logo=node.js)
![Architecture](https://img.shields.io/badge/Architecture-4--Tier%20Distributed-blue)
![Database](https://img.shields.io/badge/Database-SQLite%20(Offline%20Buffer)-orange?logo=sqlite)
![API](https://img.shields.io/badge/API-GraphQL%20%2B%20REST-magenta?logo=graphql)
![Real-Time](https://img.shields.io/badge/Streaming-Server--Sent%20Events%20(SSE)-emerald)
![Docker](https://img.shields.io/badge/Deployment-100%25%20Docker--Free-success)

---

## 📖 Overview & Motivation

Smart rings and fitness wearables continuously capture vital health telemetry such as **Heart Rate (BPM)**, **Heart Rate Variability (HRV)**, **Blood Oxygen ($SpO_2$)**, and **Circadian Sleep Stages**. 

However, smart rings face severe physical constraints:
- **Tiny battery capacity** (< 25 mAh) that quickly drains if continuously transmitting over wireless antennas.
- **Intermittent connectivity** as users move out of range of companion devices or experience network dropouts.
- **Data fragmentation and duplicate records** across smartphones, tablets, and cloud backends.

This project addresses these challenges with a **multi-tier distributed architecture**:
1. The **wearable ring offloads data locally** to a nearby companion **Mobile Gateway** instead of maintaining continuous long-distance cloud connections.
2. The **Mobile Gateway acts as an offline-first buffer** using embedded **SQLite**, guaranteeing zero data loss during network disruptions.
3. **Batch and delta synchronization** minimize wireless transmissions and eliminate redundant data.
4. The **Central Backend** normalizes records, exposes an **Apollo GraphQL API**, and broadcasts live updates over a real-time event stream to connected **Web Dashboards**.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────┐
│     Tier 1: Smart Ring          │
│   (Wearable BLE Simulator)      │
│   - Heart Rate (60-100 BPM)     │
│   - SpO2 (95-99%)               │
│   - HRV (35-80 ms)              │
│   - Sleep Stages (Deep/REM/...) │
└───────────────┬─────────────────┘
                │ HTTP POST /data (every 5s)
                ▼
┌─────────────────────────────────┐
│     Tier 2: Mobile Gateway      │
│     (Offline-First Buffer)      │
│   - Embedded SQLite (queue.db)  │
│   - Delta & Batch Sync Engine   │
│   - GET /data Queue Inspector   │
└───────────────┬─────────────────┘
                │ HTTP POST /api/sync (batch flush)
                ▼
┌─────────────────────────────────┐
│     Tier 3: Central Backend     │
│    (Normalization & Storage)    │
│   - SQLite Store (ecosystem.db) │
│   - Apollo/GraphQL (/graphql)   │
│   - Real-Time SSE Stream        │
│   - Auth Endpoint (student)     │
└───────────────┬─────────────────┘
                │ Live Event Stream (/api/stream)
                ▼
┌─────────────────────────────────┐
│     Tier 4: Web Dashboard       │
│      (http://localhost:3000)    │
│   - Real-Time Telemetry Cards   │
│   - Dynamic Canvas HRV/HR Chart │
│   - Synchronized Packet Stream  │
│   - Interactive Action Controls │
└─────────────────────────────────┘
```

---

## ✨ Key Features

- **🔋 Battery-Efficient Ingestion**: Sensor telemetry is transferred locally to the mobile gateway every 5s, reducing transmitter duty cycles.
- **💾 Offline-First SQLite Queue**: All records are buffered in `queue.db`. If the central server is unreachable, records safely accumulate locally without dropping packets.
- **🔄 Delta & Batch Synchronization**: The gateway flushes accumulated packets in atomic batches and clears only acknowledged records, preventing duplicates.
- **⚡ GraphQL API & Interactive Playground**: Access biometrics via GraphQL queries (`recentBiometrics`) and mutations (`addBiometric`, `addBiometricsBatch`) at `/graphql`.
- **📡 Real-Time Telemetry Streaming**: Push updates to browsers using lightweight Server-Sent Events (SSE) with zero polling overhead.
- **📊 Modern Glassmorphism Dashboard**:
  - Live animated Heart Rate card with pulsating ECG animation.
  - $SpO_2$ Blood Oxygen status gauge.
  - Autonomic HRV balance meter.
  - Circadian sleep stage badges (`DEEP`, `REM`, `LIGHT`, `AWAKE`).
  - Rolling Canvas time-series chart plotting HR & HRV simultaneously.
  - Telemetry log table highlighting incoming packets in real-time.
- **🛠️ Interactive Testing Bar**:
  - `Simulate Ring Packet`: Inject an immediate test packet.
  - `Trigger Gateway Batch Sync`: Force an immediate synchronization cycle.
  - `Query GraphQL API`: Execute live GraphQL queries from a modal.
  - `View Gateway /data`: Directly inspect the live SQLite buffer.
- **🚀 100% Native & Docker-Free**: Runs directly with Node.js on any operating system without Docker Desktop, WSL2, or daemon requirements.

---

## 📁 Repository Structure

```
ecosystem-sync/
├── start.js                    # Unified multi-service launcher
├── package.json                # Project root metadata & scripts
├── README.md                   # Complete architectural documentation
├── .gitignore                  # Git exclusion rules
│
├── simulator/                  # Tier 1: Wearable Sensor Simulator
│   ├── src/index.js            # Emits realistic biometric packets every 5s
│   └── package.json
│
├── mobile-gateway/             # Tier 2: Offline-First Gateway
│   ├── src/index.js            # Express server, SQLite queue & batch sync
│   ├── public/index.html       # Web Dashboard static asset
│   └── package.json
│
├── backend/                    # Tier 3: Central Backend API
│   ├── src/
│   │   ├── index.js            # Express server, GraphQL handler, SSE & REST
│   │   ├── schema/
│   │   │   └── schema.graphql  # GraphQL schema definition
│   │   └── resolvers/
│   │       └── biometric.js    # SQLite storage operations & resolvers
│   ├── public/index.html       # Web Dashboard static asset
│   └── package.json
│
└── web-dashboard/              # Tier 4: Dashboard assets
    ├── public/index.html       # Modern telemetry dashboard UI
    └── package.json
```

---

## 🚀 Quickstart & Setup

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/shirinhegde1/ecosystem-sync.git
cd ecosystem-sync
```

*(Note: Dependencies for submodules can be installed via `npm install` inside `mobile-gateway` and `simulator`)*.

### 2. Launch All Services
Run the unified launcher from the project root:
```bash
npm start
# or
node start.js
```

This single command starts:
1. **Central Backend** on `http://localhost:4000`
2. **Mobile Gateway & Dashboard** on `http://localhost:3000`
3. **Smart Ring Sensor Simulator** transmitting telemetry every 5 seconds.

---

## 🌐 Endpoints & URLs

| Service | URL | Protocol / Method | Description |
| :--- | :--- | :--- | :--- |
| **Live Web Dashboard** | `http://localhost:3000` | HTTP GET | Full real-time telemetry dashboard UI. |
| **Mobile Gateway Queue** | `http://localhost:3000/data` | HTTP GET / POST | View buffered SQLite records (GET) or push sensor packets (POST). |
| **Manual Gateway Sync** | `http://localhost:3000/api/sync-now` | HTTP POST | Triggers an immediate SQLite-to-backend batch sync. |
| **GraphQL API & Explorer** | `http://localhost:4000/graphql` | HTTP GET / POST | Interactive GraphQL explorer & query endpoint. |
| **Real-Time Event Stream** | `http://localhost:4000/api/stream` | Server-Sent Events | Live event stream broadcasting new biometrics. |
| **Recent Biometrics REST** | `http://localhost:4000/api/biometrics` | HTTP GET | Returns latest synced records from central SQLite store. |
| **Backend Health Check** | `http://localhost:4000/api/health` | HTTP GET | Returns system uptime, active SSE clients, and DB status. |

---

## ⚡ GraphQL Schema & Examples

### Schema
```graphql
type Biometric {
  id: ID!
  timestamp: String!
  heartRate: Int!
  hrv: Int!
  spo2: Int!
  sleepStage: String!
}

type Query {
  recentBiometrics(limit: Int = 20): [Biometric]
}

type Mutation {
  addBiometric(input: BiometricInput!): Biometric
  addBiometricsBatch(inputs: [BiometricInput!]!): [Biometric]
}

input BiometricInput {
  timestamp: String!
  heartRate: Int!
  hrv: Int!
  spo2: Int!
  sleepStage: String!
}
```

### Sample Query
```graphql
query GetRecentBiometrics {
  recentBiometrics(limit: 5) {
    id
    timestamp
    heartRate
    hrv
    spo2
    sleepStage
  }
}
```

### Sample Response
```json
{
  "data": {
    "recentBiometrics": [
      {
        "id": "ring_1730483314_abc123",
        "timestamp": "2026-11-01T17:48:34.133Z",
        "heartRate": 74,
        "hrv": 52,
        "spo2": 98,
        "sleepStage": "rem"
      }
    ]
  }
}
```

---

## 🧪 Testing Offline Resilience

To demonstrate offline recovery:
1. Observe the live dashboard at `http://localhost:3000` receiving packets every 5 seconds.
2. Stop the backend process (e.g., kill the port 4000 process).
3. Check `http://localhost:3000/data` — observe the `bufferedInSQLite` count accumulating as the ring simulator continues to generate telemetry.
4. Restart the backend process.
5. Within 5 seconds, the Mobile Gateway automatically detects backend availability, flushes the entire accumulated batch in one request, and the dashboard reflects all stored records seamlessly.

---

## 👥 Authentication & Roles
- **Default Test User**: `student`
- **Default Password**: `student123`
- **Role**: `authorized_wearable_client` (Realm: `wearable-sync`)

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
