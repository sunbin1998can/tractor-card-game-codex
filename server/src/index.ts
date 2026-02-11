import { createWsServer } from './server/ws';

const port = Number(process.env.PORT ?? 3000);
const path = '/ws';

createWsServer(port, path);
console.log(`WebSocket server listening on ws://localhost:${port}${path}`);
