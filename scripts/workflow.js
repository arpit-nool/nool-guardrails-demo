import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
const nool = process.env.NOOL_BIN || 'nool';
const stripAnsi = text => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

export function command(program, args, cwd, timeout = 90_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {
      cwd, env: { ...process.env, NO_COLOR: '1', CLICOLOR: '0', WEATHER_API_KEY: 'local-fixture-value' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '', timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeout);
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      const safeOutput = stripAnsi(output).replaceAll(`/private${cwd}`, '<demo-workspace>').replaceAll(cwd, '<demo-workspace>');
      const safeArgs = args.map(arg => arg === cwd ? '<demo-workspace>' : arg);
      resolve({ command: [path.basename(program), ...safeArgs].join(' '), code,
        timedOut, output: safeOutput });
    });
  });
}

export function verdict(result, expected) {
  if (result.timedOut) return 'error';
  if (/No unexpired Editor\/Planner contract|in Nool Enterprise|lease is missing/i.test(result.output)) return 'unavailable';
  if (expected === 'blocked') {
    return result.code === 2 && /no-weather-key-in-code|Keep the weather API key/i.test(result.output)
      ? 'blocked' : 'error';
  }
  return result.code === 0 ? 'accepted' : 'error';
}

export class DemoWorkflow {
  workspace = null;
  phase = 'new';
  records = {};
  async reset() {
    if (this.workspace?.startsWith(path.join(tmpdir(), 'nool-weather-guardrail-'))) {
      await rm(this.workspace, { recursive: true, force: true });
    }
    this.workspace = null;
    this.phase = 'new';
    this.records = {};
  }
  async prepare() {
    if (this.workspace) return;
    this.workspace = await mkdtemp(path.join(tmpdir(), 'nool-weather-guardrail-'));
    for (const dir of ['src', 'test', 'policies']) await mkdir(path.join(this.workspace, dir));
    for (const file of ['package.json', 'src/provider.js', 'test/weather.test.js', 'policies/no-weather-key.yaml']) {
      await copyFile(path.join(root, file), path.join(this.workspace, file));
    }
    await writeFile(path.join(this.workspace, 'src/weather.js'), '// Weather lookup will be added here.\n');
    await writeFile(path.join(this.workspace, '.gitignore'), '.nool/\n.claude/\n.env\n');
    const checked = async (program, args) => {
      const result = await command(program, args, this.workspace);
      if (result.code !== 0) throw new Error(result.output);
      return result;
    };
    await checked('git', ['init', '-q']);
    await checked('git', ['add', '.']);
    await checked('git', ['-c', 'user.name=Nool Demo', '-c', 'user.email=demo@example.invalid', 'commit', '-qm', 'Weather app starting point']);
    await checked(nool, ['init', '--skip-discovery', '--compact']);
    this.records.version = await checked(nool, ['version']);
    this.phase = 'ready';
  }
  async checkUnsafe() {
    await this.prepare();
    if (this.phase !== 'ready') throw new Error('Start a new demo run before checking again.');
    await copyFile(path.join(root, 'scenarios/unsafe.txt'), path.join(this.workspace, 'src/weather.js'));
    const tests = await command('npm', ['test'], this.workspace);
    if (tests.code !== 0) throw new Error(`Functional tests failed:\n${tests.output}`);
    const before = await command('git', ['rev-parse', 'HEAD'], this.workspace);
    const result = await command(nool, ['propose', '--path', 'src/weather.js', '--project-root', this.workspace,
      '--intent', 'Add weather lookup', '--compact'], this.workspace);
    const after = await command('git', ['rev-parse', 'HEAD'], this.workspace);
    const record = { ...result, tests, verdict: verdict(result, 'blocked'), gitUnchanged: before.output === after.output };
    if (!record.gitUnchanged) record.verdict = 'error';
    this.records.unsafe = record;
    this.phase = ['blocked', 'unavailable'].includes(record.verdict) ? record.verdict : 'stopped';
    await this.save();
    return record;
  }
  async checkFixed() {
    if (!['blocked', 'unavailable'].includes(this.phase)) throw new Error('Run the first proposal check before continuing.');
    await copyFile(path.join(root, 'src/weather.js'), path.join(this.workspace, 'src/weather.js'));
    const tests = await command('npm', ['test'], this.workspace);
    if (tests.code !== 0) throw new Error(tests.output);
    const result = await command(nool, ['propose', '--path', 'src/weather.js', '--project-root', this.workspace,
      '--intent', 'Add weather lookup using server environment credentials', '--compact'], this.workspace);
    const record = { ...result, tests, verdict: verdict(result, 'accepted') };
    this.records.fixed = record;
    this.phase = record.verdict === 'accepted' ? 'accepted' : 'stopped';
    await this.save();
    return record;
  }
  async save() {
    await mkdir(path.join(root, 'artifacts'), { recursive: true });
    await writeFile(path.join(root, 'artifacts/latest-run.json'), JSON.stringify({
      recordedAt: new Date().toISOString(), phase: this.phase, ...this.records
    }, null, 2));
  }
}
