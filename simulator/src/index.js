const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRecord() {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    heartRate: randomInt(60, 100),
    hrv: randomInt(30, 80),
    spo2: randomInt(94, 100),
    sleepStage: ['awake','light','deep','rem'][randomInt(0,3)]
  };
}

async function sendRecord() {
  const record = generateRecord();
  try {
    await axios.post('http://localhost:3000/data', record);
    console.log('Sent', record.id);
  } catch (e) {
    console.error('Send failed', e.message);
  }
}

setInterval(sendRecord, 5000);
