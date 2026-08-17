import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const chrome = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9222 + Math.floor(Math.random() * 1000);
const url = process.argv[2] ?? 'http://127.0.0.1:5173/';
const waitMs = Number(process.env.RUNTIME_WAIT_MS || 6000);
const userDataDir = await mkdtemp(path.join(tmpdir(), 'three-runtime-check-'));
const proc = spawn(chrome, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=metal',
  '--no-first-run',
  '--no-default-browser-check',
  url,
], { stdio: ['ignore', 'ignore', 'pipe'] });

let chromeErr = '';
proc.stderr.on('data', data => { chromeErr += data.toString(); });

async function waitJson(endpoint, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return await response.json();
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout waiting for ${endpoint}`);
}

try {
  const tabs = await waitJson(`http://127.0.0.1:${port}/json`);
  const tab = tabs.find(item => item.type === 'page') ?? tabs[0];
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  const events = [];
  let id = 0;
  const send = method => socket.send(JSON.stringify({ id: ++id, method }));

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout opening CDP websocket')), 10000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.consoleAPICalled') {
      events.push({
        kind: 'console',
        type: message.params.type,
        text: message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' '),
      });
    }
    if (message.method === 'Runtime.exceptionThrown') {
      events.push({ kind: 'exception', type: 'error', text: message.params.exceptionDetails.text });
    }
    if (message.method === 'Log.entryAdded') {
      events.push({ kind: 'log', type: message.params.entry.level, text: message.params.entry.text });
    }
  });

  send('Runtime.enable');
  send('Log.enable');
  send('Page.enable');
  await new Promise(resolve => setTimeout(resolve, waitMs));
  socket.close();

  const bad = events.filter(event => {
    if (event.kind === 'exception' || ['error', 'assert'].includes(event.type)) return true;
    if (/^THREE\.WebGLRenderer \d+/.test(event.text)) return false;
    return /deprecated|deprecation|THREE|WebGL|shader|compile|link/i.test(event.text);
  });

  if (bad.length) {
    console.error(JSON.stringify(bad, null, 2));
    process.exitCode = 1;
  } else {
    console.log('Chrome runtime check passed');
    if (events.length) console.log(JSON.stringify(events, null, 2));
  }
} finally {
  proc.kill('SIGTERM');
}
