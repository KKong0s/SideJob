// Share mode (`share.bat`): the app is opened through a temporary public tunnel link.
// Everything goes through that same link, and proxy.share.mjs forwards it to the local Node-RED,
// so the URLs are relative to whatever address the visitor opened.
const wsScheme = location.protocol === 'https:' ? 'wss' : 'ws';

export const environment = {
  production: true,
  apiUrl: '/api',
  uploadsUrl: '/uploads',
  /** Chat WebSocket on the same link */
  wsUrl: `${wsScheme}://${location.host}/ws/chat`,
  /** Empty: hides the Google button (Google only accepts registered origins, the tunnel link changes every run) */
  googleClientId: '',
};
