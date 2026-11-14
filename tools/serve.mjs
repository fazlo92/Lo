// Dev preview: node tools/serve.mjs  -> open http://127.0.0.1:8080/engine/index.html?topic=nombor&play
import { startServer } from './server.mjs';
const s = await startServer(8080);
console.log(`http://127.0.0.1:${s.address().port}/engine/index.html?topic=nombor&play`);
