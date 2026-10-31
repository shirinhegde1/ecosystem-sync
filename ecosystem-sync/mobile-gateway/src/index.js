const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------- SQLite offline queue ----------
const db = new sqlite3.Database('./queue.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS queue (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);
});

function enqueue(record) {
  const stmt = db.prepare('INSERT OR REPLACE INTO queue (id, payload, createdAt) VALUES (?, ?, ?)');
  stmt.run(record.id, JSON.stringify(record), new Date().toISOString());
  stmt.finalize();
}

function getAllQueued() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM queue ORDER BY createdAt ASC', [], (err, rows) => {
      if (err) return reject(err);
      const records = rows.map(r => JSON.parse(r.payload));
      resolve(records);
    });
  });
}

function clearQueue() {
  db.run('DELETE FROM queue');
}

// ---------- Forward helper ----------
async function forwardBatch(records) {
  if (!records.length) return;
  try {
    await axios.post('http://localhost:4000/api/sync', records);
    // success → remove from queue
    clearQueue();
    console.log(`✅ Forwarded ${records.length} records to backend`);
  } catch (e) {
    console.warn('⚠️ Forward failed, will keep records offline');
  }
}

// ---------- Receive data from wearable simulator ----------
app.post('/data', async (req, res) => {
  const record = req.body;
  if (!record || !record.id) {
    return res.status(400).json({ error: 'Invalid record' });
  }
  enqueue(record);
  // try immediate forward (may succeed if network is up)
  const pending = await getAllQueued();
  await forwardBatch(pending);
  res.json({ status: 'queued' });
});

// optional manual flush endpoint for testing
app.post('/flush', async (req, res) => {
  const pending = await getAllQueued();
  await forwardBatch(pending);
  res.json({ flushed: pending.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 Mobile gateway listening on http://localhost:${PORT}`);
});
