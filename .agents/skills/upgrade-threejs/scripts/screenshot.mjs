import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const chrome = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9333 + Math.floor(Math.random() * 1000);
const url = process.argv[2];
const output = process.argv[3];
const waitMs = Number(process.env.SCREENSHOT_WAIT_MS || 6000);
if (!url || !output) throw new Error('Usage: screenshot.mjs <url> <output.png>');

const userDataDir = await mkdtemp(path.join(tmpdir(), 'three-screenshot-'));
const proc = spawn(chrome, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=metal',
  '--window-size=1050,768',
  '--no-first-run',
  '--no-default-browser-check',
  url,
], { stdio: 'ignore' });

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
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    socket.send(JSON.stringify({ id: messageId, method, params }));
  });

  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1050,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise(resolve => setTimeout(resolve, waitMs));
  const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(output, Buffer.from(screenshot.data, 'base64'));
  socket.close();
  console.log(output);
} finally {
  proc.kill('SIGTERM');
}
