// Android app (debug) settings, used by `npm run build:android`.
// 10.0.2.2 is this computer as seen from the Android emulator.
// On a real phone, replace it with this machine's LAN IP (e.g. 192.168.1.10).
export const environment = {
  production: true,
  apiUrl: 'http://10.0.2.2:1881/api',
  uploadsUrl: 'http://10.0.2.2:1881/uploads',
  /** Chat WebSocket (same host as the API) */
  wsUrl: 'ws://10.0.2.2:1881/ws/chat',
  /** Web client ID: the native Google plugin asks for ID tokens issued to this audience */
  googleClientId: '786500969777-nrdp5j2356h8uhs7ud9888ji8l42gk8m.apps.googleusercontent.com',
};
