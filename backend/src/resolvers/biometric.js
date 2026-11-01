const mongoose = require('mongoose');

const biometricSchema = new mongoose.Schema({
  timestamp: { type: String, required: true },
  heartRate: { type: Number, required: true },
  hrv: { type: Number, required: true },
  spo2: { type: Number, required: true },
  sleepStage: { type: String, required: true }
});

mongoose.model('Biometric', biometricSchema);

module.exports = {
  Query: {
    recentBiometrics: async (_, { limit }) => {
      const Biometric = mongoose.model('Biometric');
      return Biometric.find().sort({ timestamp: -1 }).limit(limit);
    }
  },
  Mutation: {
    addBiometric: async (_, { input }, context) => {
      const Biometric = mongoose.model('Biometric');
      const doc = await Biometric.create(input);
      const io = context?.req?.app?.get('io');
      if (io) io.emit('biometric_added', doc);
      return doc;
    },
    addBiometricsBatch: async (_, { inputs }, context) => {
      const Biometric = mongoose.model('Biometric');
      const docs = await Biometric.insertMany(inputs);
      const io = context?.req?.app?.get('io');
      if (io) docs.forEach(d => io.emit('biometric_added', d));
      return docs;
    }
  }
};
