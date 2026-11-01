const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRecord() {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    heartRate: randomInt(64, 96),
    hrv: randomInt(35, 78),
    spo2: randomInt(95, 99),
    sleepStage: ['awake', 'light', 'deep', 'rem'][randomInt(0, 3)]
  };
}

async function sendRecord() {
  const record = generateRecord();
  try {
    const res = await axios.post('http://localhost:3000/data', record, { timeout: 3000 });
    console.log(`[Smart Ring BLE] Telemetry -> HR: ${record.heartRate} bpm | SpO2: ${record.spo2}% | HRV: ${record.hrv}ms | Stage: ${record.sleepStage} (${res.data.status})`);
  } catch (e) {
    console.warn(`[Smart Ring BLE] Gateway connect retry (${e.message})`);
  }
}

console.log('Smart Ring Wearable Sensor Simulator started (transmitting every 5s)...');
// Emit immediately on start
sendRecord();
setInterval(sendRecord, 5000);
