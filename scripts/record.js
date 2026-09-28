import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const serverPath = fileURLToPath(new URL('../server.js', import.meta.url));
console.log('Before recording, run `npm run demo:verify` with an activated Nool Editor/Planner contract.');
console.log('A success means Nool blocked the fake key and accepted the environment-variable fix.');
console.log('If verification stops at a contract requirement, the guardrail has not been demonstrated.');
console.log('Starting the local screen demo at http://127.0.0.1:4175');
const child = spawn(process.execPath, [serverPath], { stdio: 'inherit', env: { ...process.env, PORT: process.env.PORT || '4175' }, cwd: path.dirname(serverPath) });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 0; });
