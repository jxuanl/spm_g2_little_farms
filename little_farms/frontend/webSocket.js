// services/webSocket.js
const ws = new WebSocket('ws://localhost:3001');

// optional connection logs
ws.onopen = () => console.log('✅ WebSocket connected to backend');
ws.onclose = (e) => console.warn('⚠️ WebSocket closed:', e.code, e.reason);
ws.onerror = (e) => console.error('❌ WebSocket error:', e);

export default ws;
