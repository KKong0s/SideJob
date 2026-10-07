/**
 * Node-RED settings for SideJob.
 * All secrets come from environment variables (see .env.example). Nothing secret lives in flows.json.
 */
const env = process.env;

function required(name) {
  if (!env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return env[name];
}

const corsOrigins = (env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = {
  uiPort: Number(env.PORT) || 1880,

  flowFile: 'flows.json',
  flowFilePretty: true,
  // flows_cred.json is committed and must only contain ${ENV_VAR} placeholders, never real values.
  credentialSecret: false,

  // Login for the flow editor
  adminAuth: {
    type: 'credentials',
    users: [
      {
        username: env.NODE_RED_ADMIN_USER || 'admin',
        password: required('NODE_RED_ADMIN_PASSWORD_HASH'), // bcrypt hash
        permissions: '*',
      },
    ],
  },

  // CORS for http-in endpoints (/api/...)
  httpNodeCors: {
    origin: corsOrigins,
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  },

  // Chat WebSocket (/ws/chat): only the app's own origins may connect (same list as CORS).
  // Each socket must still send a valid JWT before it receives anything.
  webSocketNodeVerifyClient: function (info) {
    return corsOrigins.includes(info.origin);
  },

  // Only the public uploads folder is served. uploads/private (shop verification docs) is never static.
  httpStatic: [{ path: '/data/uploads/public', root: '/uploads/' }],

  // Libraries for function nodes: global.get('bcrypt'), global.get('jwt'), global.get('googleAuth'), global.get('crypto')
  functionExternalModules: false,
  functionGlobalContext: {
    bcrypt: require('bcryptjs'),
    jwt: require('jsonwebtoken'),
    googleAuth: require('google-auth-library'),
    crypto: require('crypto'),
    // SideJob helpers: transactions (mysql2 pool), paging, notifications, audit log, uploads
    sj: require('./helpers/sidejob'),
  },
  exportGlobalContextKeys: false,

  logging: {
    console: {
      level: env.NODE_RED_LOG_LEVEL || 'info',
      metrics: false,
      audit: false,
    },
  },

  editorTheme: {
    projects: { enabled: false },
    tours: false,
  },
};
