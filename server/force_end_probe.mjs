import WebSocket from 'ws';

const ws = new WebSocket('ws://127.0.0.1:3000/ws');
let sent = false;

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: 'force-test', name: 'T1', players: 4 }));
  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'FORCE_END_ROUND' }));
    sent = true;
  }, 200);
  setTimeout(() => ws.close(), 2000);
});

ws.on('message', (d) => {
  const m = JSON.parse(d.toString());
  if (m.type === 'ROUND_RESULT' || m.type === 'ACTION_REJECTED' || m.type === 'PHASE') {
    console.log('MSG', m.type, JSON.stringify(m));
  }
});

ws.on('close', () => {
  if (!sent) console.log('did_not_send');
  process.exit(0);
});
