const mongoose = require('mongoose');

const biometricSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: Date, required: true },
  heartRate: Number,
  hrv: Number,
  spo2: Number,
  sleepStage: String,
});

module.exports = mongoose.model('Biometric', biometricSchema);
