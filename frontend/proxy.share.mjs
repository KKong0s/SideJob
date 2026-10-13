// Dev-server proxy for share mode (`npm run share`): forwards only the API, uploaded files and the
// chat WebSocket to the local Node-RED. The Node-RED editor and phpMyAdmin are not reachable.
const target = 'http://localhost:1881';
// Node-RED only accepts chat sockets from origins in CORS_ORIGINS, and the tunnel link changes
// every run, so the socket is presented to Node-RED as coming from the local dev origin.
const localOrigin = 'http://localhost:4200';

export default {
  '/api': { target, changeOrigin: true },
  '/uploads': { target, changeOrigin: true },
  '/ws/chat': {
    target,
    ws: true,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReqWs', (proxyReq) => proxyReq.setHeader('Origin', localOrigin));
    },
  },
};
