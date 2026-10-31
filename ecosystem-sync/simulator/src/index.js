const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// URL of the mobile‑gateway endpoint (Expo app will expose this via ngrok or local network).
const GATEWAY_URL = 'http://localhost:3000/data'; // mobile gateway endpoint

function generateRecord() {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    timestamp: now,
    heartRate: 60 + Math.floor(Math.random() * 40), // 60‑100 bpm
    hrv: parseFloat((20 + Math.random() * 30).toFixed(2)),
    spo2: parseFloat((95 + Math.random() * 4).toFixed(2)),
    sleepStage: ['awake', 'light', 'deep', 'rem'][Math.floor(Math.random() * 4)],
  };
}

async function pushRecord() {
  try {
    const rec = generateRecord();
    await axios.post(GATEWAY_URL, rec);
    console.log('✅ Sent', rec.id);
  } catch (e) {
    console.error('❌ Failed to push', e.message);
  }
}

setInterval(pushRecord, 5000);
