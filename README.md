# Ecosystem Sync Platform

This repository implements the **Ecosystem Sync Platform for Smart Rings & Wearables** as described in the Review 1 specification.

## Project structure
```
ecosystem-sync/
├─ docker-compose.yml                 # Docker services (MongoDB, Keycloak, Backend)
├─ README.md                         # This file
├─ simulator/                         # Wearable data generator
│   ├─ package.json
│   └─ src/index.js
├─ mobile-gateway/                    # Offline‑first gateway (Express + SQLite)
│   ├─ package.json
│   └─ src/index.js
├─ backend/                           # Node + Apollo GraphQL + Socket.IO
│   ├─ Dockerfile
│   ├─ package.json
│   └─ src/
│       ├─ index.js
│       ├─ schema/schema.graphql
│       ├─ resolvers/biometric.js
│       └─ db/mongoose.js
├─ web-dashboard/                     # React dashboard
│   ├─ package.json
│   └─ src/
│       ├─ index.js
│       ├─ App.js
│       └─ components/Dashboard.js
└─ keycloak/
    └─ realm-wearable-sync.json      # Pre‑populated Keycloak realm
```

## Getting started
1. **Clone the repo** (already done).
2. **Start Docker services**
   ```powershell
   docker compose up -d
   ```
3. **Install & run each component** (see each folder’s README for details).
4. Open the dashboard at `http://localhost:3000`.

The system includes:
- A simulator that emits biometric data every 5 s.
- A mobile gateway that queues data offline in SQLite.
- A GraphQL backend backed by MongoDB, secured by Keycloak.
- A React dashboard with live updates via Socket.IO.

---
*Feel free to explore, extend the schema, or add more biometric fields.*