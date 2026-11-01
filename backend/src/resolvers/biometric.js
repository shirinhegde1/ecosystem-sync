const path = require('path');
module.paths.push(path.resolve(__dirname, '../../../mobile-gateway/node_modules'));
module.paths.push(path.resolve(__dirname, '../../../web-dashboard/node_modules'));

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ecosystem.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS biometrics (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    heartRate INTEGER NOT NULL,
    hrv INTEGER NOT NULL,
    spo2 INTEGER NOT NULL,
    sleepStage TEXT NOT NULL,
    syncedAt TEXT NOT NULL
  )`);
});

function getRecentBiometrics(limit = 20) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, timestamp, heartRate, hrv, spo2, sleepStage FROM biometrics ORDER BY datetime(timestamp) DESC LIMIT ?',
      [limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

function insertBiometric(rec) {
  return new Promise((resolve, reject) => {
    const id = rec.id || `bio_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const syncedAt = new Date().toISOString();
    const stmt = db.prepare('INSERT OR REPLACE INTO biometrics VALUES (?,?,?,?,?,?,?)');
    stmt.run(id, rec.timestamp, rec.heartRate, rec.hrv, rec.spo2, rec.sleepStage, syncedAt, function(err) {
      if (err) return reject(err);
      resolve({ id, ...rec });
    });
    stmt.finalize();
  });
}

function insertBiometricsBatch(records) {
  return new Promise((resolve, reject) => {
    if (!records || records.length === 0) return resolve([]);
    const syncedAt = new Date().toISOString();
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare('INSERT OR REPLACE INTO biometrics VALUES (?,?,?,?,?,?,?)');
      const results = [];
      for (const rec of records) {
        const id = rec.id || `bio_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        stmt.run(id, rec.timestamp, rec.heartRate, rec.hrv, rec.spo2, rec.sleepStage, syncedAt);
        results.push({ id, ...rec });
      }
      stmt.finalize();
      db.run('COMMIT', (err) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  });
}

module.exports = {
  db,
  getRecentBiometrics,
  insertBiometric,
  insertBiometricsBatch
};
