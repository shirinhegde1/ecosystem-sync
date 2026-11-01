const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

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

// Receive data from simulator
app.post('/data', (req, res) => {
  const { id, timestamp, heartRate, hrv, spo2, sleepStage } = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?,?,?,?)');
  stmt.run(id, timestamp, heartRate, hrv, spo2, sleepStage, (err) => {
    if (err) {
      console.error('DB insert error', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json({ status: 'queued' });
  });
  stmt.finalize();
});

// Helper to get all queued records
function getAllRecords(callback) {
  db.all('SELECT * FROM records', (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

// Helper to clear queue after successful sync
function clearQueue(callback) {
  db.run('DELETE FROM records', callback);
}

// Periodic sync to backend (every 10 seconds)
setInterval(() => {
  getAllRecords((err, records) => {
    if (err) { console.error('Fetch error', err); return; }
    if (records.length === 0) return; // nothing to send
    axios.post('http://localhost:4000/api/sync', records)
      .then(res => {
        console.log('Sync success', res.data);
        clearQueue((err) => {
          if (err) console.error('Clear error', err);
        });
      })
      .catch(e => console.error('Sync failed', e.message));
  });
}, 10000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mobile gateway listening on http://localhost:${PORT}`));
