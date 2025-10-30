const ws = new WebSocket('ws://localhost:3001'); // same port as the backend websocket

// ws.onopen = () => console.log('WebSocket connected');
// ws.onmessage = (event) => {
// const data = JSON.parse(event.data);
//   if (data.type === 'deadlineReminder') {
//     // Show notification UI with data.message or data.changes
//     console.log('Notification:', data.message);
//   }
// };

ws.onopen = () => console.log('✅ WS open on localhost:3001');
ws.onmessage = (event) => {
const data = JSON.parse(event.data);
  if (data.type === 'deadlineReminder') {
    // Show notification UI with data.message or data.changes
    console.log('Notification:', data.message);
  }
};
ws.onclose = (e) => console.warn('⚠️ WS close', e.code, e.reason);
ws.onerror = (e) => console.error('❌ WS error', e);

export default ws;