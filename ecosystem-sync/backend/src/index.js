const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ApolloServer } = require('apollo-server-express');
const { readFileSync } = require('fs');
const mongoose = require('mongoose');
const Keycloak = require('keycloak-connect');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------- Keycloak ----------
const keycloak = new Keycloak({ store: new Map() }, {
  realm: process.env.KEYCLOAK_REALM,
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  bearerOnly: true,
  serverUrl: `${process.env.KEYCLOAK_URL}`,
});
app.use(keycloak.middleware());

// ---------- GraphQL ----------
const typeDefs = readFileSync('./src/schema/schema.graphql', 'utf8');
const resolvers = require('./src/resolvers/biometric');
const schema = require('@graphql-tools/schema').makeExecutableSchema({ typeDefs, resolvers });

const apollo = new ApolloServer({
  schema,
  context: ({ req }) => ({
    user: req.kauth?.grant?.access_token?.content?.preferred_username || null,
  }),
});
await apollo.start();
apollo.applyMiddleware({ app, path: '/graphql' });

// ---------- Batch sync endpoint ----------
app.post('/api/sync', async (req, res) => {
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  const result = await resolvers.Mutation.addBiometricsBatch(null, { input: payload });
  res.json({ inserted: result.length });
});

// ---------- DB ----------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// ---------- Socket.IO ----------
const server = http.createServer(app);
const io = new socketIo.Server(server, { cors: { origin: '*'} });
global.io = io; // expose for resolvers

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Missing token'));
  try {
    const grant = await keycloak.grantManager.validateAccessToken(token);
    if (grant) socket.user = grant.content;
    next();
  } catch (e) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('🔗 client connected', socket.id);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
