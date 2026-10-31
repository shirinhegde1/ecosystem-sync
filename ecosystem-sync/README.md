# Ecosystem Sync Platform

A prototype that demonstrates **battery‑efficient, offline‑first, secure, near‑real‑time** synchronization of biometric data from simulated smart rings/wearables across mobile, web and backend services.

## Stack
- **Backend** – Node.js, Express, Apollo GraphQL, Socket.IO, MongoDB, Keycloak (Docker)
- **Mobile gateway** – React‑Native (Expo) + SQLite for offline queue
- **Web dashboard** – React + Apollo Client + Socket.IO
- **Wearable simulator** – simple Node.js script generating fake biometric records
- **Infrastructure** – Docker‑Compose (MongoDB, Keycloak, Backend)

## Quick start (Windows)
```powershell
# 1. Clone / create the project folder (already done)
cd "C:/Users/SHIRIN HEGDE/OneDrive/pdfsss/ml/ecosystem-sync"

# 2. Start Docker services (MongoDB, Keycloak, Backend)
docker compose up -d

# 3. Install & run the wearable simulator
cd simulator
npm install
node src/index.js   # will start emitting data

# 4. Run the mobile gateway (Expo)
cd ../mobile-gateway
npm install
npx expo start    # scan QR with Expo Go or run on an emulator

# 5. Run the web dashboard
cd ../web-dashboard
npm install
npm start          # opens http://localhost:3000
```

Log in with the default Keycloak user **student / student123**.

The simulator posts records to the mobile gateway, the gateway stores them locally when offline and forwards them in batches to the backend. The backend validates, stores them in MongoDB and pushes real‑time updates to the dashboard via Socket.IO.

---
*All code lives under the `ecosystem-sync` directory. Feel free to explore, modify or extend any component.*