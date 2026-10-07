#!/usr/bin/env node
// Test helper: opens the chat WebSocket, authenticates with a JWT and writes every event (one JSON per line)
// to <out file> until <seconds> pass.  Usage: node ws-client.js <url> <origin> <token> <out file> <seconds>
const fs = require('fs');
const [url, origin, token, outFile, seconds] = process.argv.slice(2);

fs.writeFileSync(outFile, '');
const ws = new WebSocket(url, { headers: { Origin: origin } });
ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));
ws.onmessage = (e) => fs.appendFileSync(outFile, e.data + '\n');
ws.onerror = () => fs.appendFileSync(outFile, JSON.stringify({ type: 'socket.error' }) + '\n');
setTimeout(() => {
  ws.close();
  process.exit(0);
}, Number(seconds) * 1000);
