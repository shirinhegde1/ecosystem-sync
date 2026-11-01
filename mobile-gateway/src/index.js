const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the Web Dashboard static files
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// SQLite DB setup (in file queue.db)
const dbPath = path.join(__dirname, 'queue.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    heartRate INTEGER NOT NULL,
    hrv INTEGER NOT NULL,
    spo2 INTEGER NOT NULL,
    sleepStage TEXT NOT NULL
  )`);
});

// Helper to get all queued records
function getAllRecords(callback) {
  db.all('SELECT * FROM records ORDER BY timestamp ASC', (err, rows) => {
    if (err) return callback(err);
    callback(null, rows || []);
  });
}

// Helper to clear records by ids after successful sync
function clearRecordsByIds(ids, callback) {
  if (!ids || ids.length === 0) return callback(null);
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM records WHERE id IN (${placeholders})`, ids, callback);
}

// Helper to clear entire queue
function clearQueue(callback) {
  db.run('DELETE FROM records', callback);
}

// Receive data from simulator (POST /data)
app.post('/data', (req, res) => {
  const { id, timestamp, heartRate, hrv, spo2, sleepStage } = req.body || {};
  if (!heartRate || !spo2) {
    return res.status(400).json({ error: 'Missing required biometric fields' });
  }

  const recordId = id || `ring_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const recordTimestamp = timestamp || new Date().toISOString();

  const stmt = db.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?,?,?,?)');
  stmt.run(recordId, recordTimestamp, heartRate, hrv || 50, spo2, sleepStage || 'awake', (err) => {
    if (err) {
      console.error('[Gateway] SQLite insert error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    getAllRecords((err, rows) => {
      res.json({
        status: 'queued',
        id: recordId,
        timestamp: recordTimestamp,
        bufferedCount: rows ? rows.length : 1
      });
    });
  });
  stmt.finalize();
});

// View queued records in browser (GET /data)
app.get('/data', (req, res) => {
  getAllRecords((err, records) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      gateway: 'Mobile Synchronization Gateway (SQLite Buffer)',
      status: 'online',
      bufferedInSQLite: records.length,
      syncTarget: 'http://localhost:4000/api/sync',
      records: records
    });
  });
});

// Manual sync trigger endpoint
app.post('/api/sync-now', (req, res) => {
  syncBatchToBackend((err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// Batch sync worker
let isSyncing = false;
let lastSyncSuccess = null;

function syncBatchToBackend(callback = () => {}) {
  if (isSyncing) return callback(null, { status: 'already_syncing' });

  getAllRecords((err, records) => {
    if (err) {
      console.error('[Gateway] Fetch error from SQLite:', err.message);
      return callback(err);
    }
    if (records.length === 0) {
      return callback(null, { status: 'idle', count: 0 });
    }

    isSyncing = true;
    const idsToSync = records.map(r => r.id);

    axios.post('http://localhost:4000/api/sync', records, { timeout: 4000 })
      .then(response => {
        if (response.data && response.data.status === 'ok') {
          clearRecordsByIds(idsToSync, (delErr) => {
            isSyncing = false;
            lastSyncSuccess = new Date().toISOString();
            console.log(`[Gateway] Synced batch of ${records.length} records to Backend at ${lastSyncSuccess}`);
            callback(null, { status: 'synced', count: records.length, backendResponse: response.data });
          });
        } else {
          isSyncing = false;
          callback(null, { status: 'backend_rejected', data: response.data });
        }
      })
      .catch(e => {
        isSyncing = false;
        console.warn(`[Gateway Offline Buffer] Backend at :4000 unreachable (${e.message}). Retaining ${records.length} records in SQLite.`);
        callback(e);
      });
  });
}

// Run sync every 5 seconds
setInterval(() => {
  syncBatchToBackend();
}, 5000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Mobile Gateway running at http://localhost:${PORT}`);
  console.log(`Web Dashboard: http://localhost:${PORT}`);
  console.log(`Wearable Queue Endpoint: http://localhost:${PORT}/data`);
  console.log(`Offline-first DB: SQLite (${dbPath})`);
  console.log(`=======================================================`);
});
