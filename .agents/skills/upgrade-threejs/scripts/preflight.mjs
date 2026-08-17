#!/usr/bin/env node
/**
 * Verify the one-segment migration contract before any source edit.
 * This script is intentionally fail-fast: a non-zero exit means stop.
 */
import { execFileSync } from 'node:child_process';
import { readlinkSync } from 'node:fs';

const [fromArg, targetArg] = process.argv.slice(2);
const from = Number(fromArg);
const target = Number(targetArg);
const currentPort = Number(process.env.THREE_CURRENT_PORT || 5173);
const referencePort = Number(process.env.THREE_REFERENCE_PORT || 4173);
const referenceBranch = process.env.THREE_REFERENCE_BRANCH || 'refactor/referece';

const fail = message => {
  console.error(`PREFLIGHT FAILED: ${message}`);
  process.exit(1);
};
if (!Number.isInteger(from) || !Number.isInteger(target)) fail('usage: preflight.mjs <current> <target>');
if (target !== from + 1) fail(`one-segment rule violated: expected ${from + 1}, received ${target}`);

function command(name, args) {
  try { return execFileSync(name, args, { encoding: 'utf8' }).trim(); }
  catch { return ''; }
}
function portPids(port) {
  const lsof = command('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fp']);
  if (lsof) return [...lsof.matchAll(/^p(\d+)$/gm)].map(match => Number(match[1]));
  const ss = command('ss', ['-ltnpH']);
  return [...ss.matchAll(new RegExp(`:${port}\\s+.*?pid=(\\d+)`, 'g'))].map(match => Number(match[1]));
}
function pidCwd(pid) {
  const output = command('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn']);
  if (output) return output.split('\n').find(line => line.startsWith('n'))?.slice(1) || '';
  try { return readlinkSync(`/proc/${pid}/cwd`); } catch { return ''; }
}
function worktrees() {
  const output = command('git', ['worktree', 'list', '--porcelain']);
  const result = [];
  let item;
  for (const line of output.split('\n')) {
    if (line.startsWith('worktree ')) { item = { path: line.slice(9) }; result.push(item); }
    if (item && line.startsWith('branch ')) item.branch = line.slice(7).replace(/^refs\/heads\//, '');
  }
  return result;
}

const repo = command('git', ['rev-parse', '--show-toplevel']);
if (!repo) fail('not inside a git worktree');
const status = command('git', ['status', '--short']);
if (status) console.warn('PREFLIGHT: existing changes detected; they must not be included in the migration commit.');
const reference = worktrees().find(item => item.branch === referenceBranch);
if (!reference) fail(`worktree for ${referenceBranch} was not found`);

const referencePids = portPids(referencePort);
if (!referencePids.length) fail(`reference port ${referencePort} is not listening`);
const referenceProcess = referencePids.find(pid => {
  const cwd = pidCwd(pid);
  return cwd === reference.path || cwd.startsWith(`${reference.path}/`);
});
if (!referenceProcess) {
  fail(`port ${referencePort} is not served by ${referenceBranch} worktree ${reference.path} (PIDs: ${referencePids.join(', ')})`);
}
const referenceHead = command('git', ['-C', reference.path, 'rev-parse', 'HEAD']);
const referenceBranchActual = command('git', ['-C', reference.path, 'branch', '--show-current']);
if (referenceBranchActual !== referenceBranch) fail(`reference worktree branch is ${referenceBranchActual || '(detached)'}`);
console.log(`reference: port=${referencePort} pid=${referenceProcess} cwd=${reference.path} branch=${referenceBranch} commit=${referenceHead}`);

if (!portPids(currentPort).length) fail(`current port ${currentPort} is not listening; start pnpm run dev first`);

console.log(`current: port=${currentPort} source version must be verified before running this gate`);
const guideUrl = 'https://raw.githubusercontent.com/wiki/mrdoob/three.js/Migration-Guide.md';
const guide = await (await fetch(guideUrl)).text();
const heading = new RegExp(`^## r?${from} → r?${target}\\s*$`, 'm');
if (!heading.test(guide)) fail(`official migration section r${from} → r${target} was not found`);
console.log(`official section: r${from} → r${target}`);
console.log('PREFLIGHT PASSED: read evidence above before editing.');
