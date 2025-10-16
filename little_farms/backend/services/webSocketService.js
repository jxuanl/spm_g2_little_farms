// services/webSocketService.js
import { WebSocketServer, WebSocket } from 'ws';

let wss;
let currentClient = null; // one browser tab per user (your current assumption)

let resolveWhenConnected;
export const whenConnected = new Promise((res) => { resolveWhenConnected = res; });

export function attachWebSocket(server) {
  wss = new WebSocketServer({ server, perMessageDeflate: true });
  console.log('WebSocket attached to HTTP server');

  wss.on('connection', (ws) => {
    console.log('WS client connected');
    currentClient = ws;
    resolveWhenConnected?.();
    ws.on('message', (data) => {
      console.log('WS message received:', data.toString());
    });

    ws.on('close', () => {
      console.log('WS client disconnected');
      currentClient = null;
    });
  });
}

/** Send to the single connected client (if present) */
export function sendToUser(data) {
  if (!currentClient || currentClient.readyState !== WebSocket.OPEN) {
    console.warn('No active WebSocket connection to send to.');
    return;
  }
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  currentClient.send(payload);
}
