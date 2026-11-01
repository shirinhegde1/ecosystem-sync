const express = require('express');
const http = require('http');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const cors = require('cors');
const socketIo = require('socket.io');
const keycloakConnect = require('keycloak-connect');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

// Load GraphQL schema and resolvers
const typeDefs = fs.readFileSync(path.join(__dirname, 'schema', 'schema.graphql'), 'utf8');
const resolvers = require('./resolvers/biometric');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Keycloak protection
const keycloakConfig = {
  clientId: 'backend',
  bearerOnly: true,
  serverUrl: process.env.KEYCLOAK_URL || 'http://localhost:8080/auth',
  realm: 'wearable-sync',
  credentials: { secret: 'backend-secret' }
};
const memoryStore = new session.MemoryStore();
const keycloak = new keycloakConnect({ store: memoryStore }, keycloakConfig);
app.use(keycloak.middleware());

// GraphQL server
const schema = makeExecutableSchema({ typeDefs, resolvers });
const apollo = new ApolloServer({ schema });
await apollo.start();
app.use('/graphql', expressMiddleware(apollo, { context: async ({ req }) => ({ token: req.headers.authorization }) }));

// HTTP server for Socket.IO
const server = http.createServer(app);
const io = new socketIo.Server(server, { cors: { origin: '*' } });
app.set('io', io);

// Batch sync endpoint (called by mobile gateway)
app.post('/api/sync', keycloak.protect(), async (req, res) => {
  const records = req.body; // expecting array of biometric objects
  try {
    const Biometric = mongoose.model('Biometric');
    await Biometric.insertMany(records);
    // Emit real‑time updates
    records.forEach(rec => io.emit('biometric_added', rec));
    res.json({ status: 'ok', inserted: records.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Connect to MongoDB then start server
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ecosystem';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
  })
  .catch(err => console.error('Mongo connection error', err));
