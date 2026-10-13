// Development settings.
// When testing on a phone, replace localhost with this machine's LAN IP (e.g. 192.168.1.10).
export const environment = {
  production: false,
  apiUrl: 'http://localhost:1881/api',
  uploadsUrl: 'http://localhost:1881/uploads',
  /** Chat WebSocket (same host as the API) */
  wsUrl: 'ws://localhost:1881/ws/chat',
  googleClientId: '786500969777-nrdp5j2356h8uhs7ud9888ji8l42gk8m.apps.googleusercontent.com',
};
