const resolvers = {
  Query: {
    biometric: async (_, { id }) => {
      return await require('../db/mongoose').findOne({ id });
    },
    biometrics: async (_, { limit = 20, offset = 0 }) => {
      return await require('../db/mongoose')
        .find()
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit);
    },
  },
  Mutation: {
    addBiometric: async (_, { input }) => {
      const Biometric = require('../db/mongoose');
      const doc = new Biometric({
        ...input,
        timestamp: new Date(input.timestamp),
      });
      await doc.save();
      global.io.emit('biometric_added', doc);
      return doc;
    },
    addBiometricsBatch: async (_, { input }) => {
      const Biometric = require('../db/mongoose');
      const docs = input.map(i => ({
        ...i,
        timestamp: new Date(i.timestamp),
      }));
      const created = await Biometric.insertMany(docs, { ordered: false });
      global.io.emit('biometrics_batch', created);
      return created;
    },
  },
};

module.exports = resolvers;
