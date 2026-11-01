const path = require('path');
// Add paths to find installed modules without Docker or new installations
module.paths.push(path.resolve(__dirname, '../../mobile-gateway/node_modules'));
module.paths.push(path.resolve(__dirname, '../../web-dashboard/node_modules'));
module.paths.push(path.resolve(__dirname, '../node_modules'));

const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const { buildSchema, graphql } = require('graphql');

const { db, getRecentBiometrics, insertBiometric, insertBiometricsBatch } = require('./resolvers/biometric');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static dashboard files if available
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Keep track of active SSE client connections for real-time streaming
const sseClients = new Set();

function broadcastEvent(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Real-Time Server-Sent Events endpoint
app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('event: connected\ndata: {"status":"connected"}\n\n');
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Authentication endpoint (User / user123)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (
    (username === 'user' && password === 'user123') ||
    (username === 'student' && password === 'student123') ||
    (username === 'admin' && password === 'admin')
  ) {
    return res.json({
      token: `token_${Date.now()}_auth_ok`,
      user: {
        username,
        role: 'authorized_wearable_client',
        realm: 'wearable-sync'
      }
    });
  }
  return res.status(401).json({ error: 'Invalid credentials. Use user / user123' });
});

// Batch sync endpoint (called by mobile gateway)
app.post('/api/sync', async (req, res) => {
  let records = req.body;
  if (!Array.isArray(records)) {
    records = records ? [records] : [];
  }

  try {
    const inserted = await insertBiometricsBatch(records);
    for (const rec of inserted) {
      broadcastEvent('biometric_added', rec);
    }
    console.log(`[Backend Sync] Synced ${inserted.length} records from Mobile Gateway.`);
    res.json({ status: 'ok', inserted: inserted.length });
  } catch (err) {
    console.error('[Backend Sync Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// REST endpoint for recent biometrics
app.get('/api/biometrics', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  try {
    const rows = await getRecentBiometrics(limit);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GraphQL Setup
const schemaPath = path.join(__dirname, 'schema', 'schema.graphql');
const typeDefs = fs.readFileSync(schemaPath, 'utf8');
const schema = buildSchema(typeDefs);

const rootResolvers = {
  recentBiometrics: async ({ limit }) => {
    return await getRecentBiometrics(limit || 20);
  },
  addBiometric: async ({ input }) => {
    const doc = await insertBiometric(input);
    broadcastEvent('biometric_added', doc);
    return doc;
  },
  addBiometricsBatch: async ({ inputs }) => {
    const docs = await insertBiometricsBatch(inputs);
    for (const d of docs) {
      broadcastEvent('biometric_added', d);
    }
    return docs;
  }
};

// GraphQL endpoint (supports POST queries and GET in-browser explorer)
app.all('/graphql', async (req, res) => {
  if (req.method === 'GET' && !req.query.query) {
    // Return interactive HTML GraphQL tester
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ecosystem-Sync GraphQL API</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
          textarea { width: 100%; height: 120px; background: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 10px; font-family: monospace; border-radius: 6px; }
          button { background: #38bdf8; color: #0f172a; font-weight: bold; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px; }
          pre { background: #1e293b; padding: 15px; border-radius: 6px; overflow-x: auto; color: #4ade80; }
        </style>
      </head>
      <body>
        <h2>⚡ Ecosystem-Sync GraphQL Endpoint (/graphql)</h2>
        <p>Run your GraphQL queries below:</p>
        <textarea id="q">query {
  recentBiometrics(limit: 10) {
    id
    timestamp
    heartRate
    hrv
    spo2
    sleepStage
  }
}</textarea><br>
        <button onclick="runQuery()">Execute Query</button>
        <h3>Response:</h3>
        <pre id="output">Click Execute Query to view live GraphQL data...</pre>
        <script>
          async function runQuery() {
            const query = document.getElementById('q').value;
            const res = await fetch('/graphql', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query })
            });
            const data = await res.json();
            document.getElementById('output').textContent = JSON.stringify(data, null, 2);
          }
        </script>
      </body>
      </html>
    `);
  }

  const query = req.body?.query || req.query?.query;
  const variables = req.body?.variables || {};

  if (!query) {
    return res.status(400).json({ errors: [{ message: 'No query string provided' }] });
  }

  try {
    const result = await graphql({
      schema,
      source: query,
      rootValue: rootResolvers,
      variableValues: variables
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ errors: [{ message: err.message }] });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    db: 'SQLite (ecosystem.db)',
    sseClients: sseClients.size
  });
});

const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Backend Server running at http://localhost:${PORT}`);
  console.log(`GraphQL API: http://localhost:${PORT}/graphql`);
  console.log(`Real-Time SSE Stream: http://localhost:${PORT}/api/stream`);
  console.log(`Sync Endpoint: http://localhost:${PORT}/api/sync`);
  console.log(`=======================================================`);
});
