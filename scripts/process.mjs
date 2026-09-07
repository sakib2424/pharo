import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const npm = 'npm';

function launch(command, args, options) {
  // Invoke npm's JavaScript entry point directly. This also works on Windows,
  // where npm.cmd cannot be spawned without an intermediate command shell.
  if (command === npm && process.env.npm_execpath) {
    args = [process.env.npm_execpath, ...args];
    command = process.execPath;
  }
  return spawn(command, args, options);
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = launch(command, args, { cwd: root, stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${signal ?? code}`));
    });
  });
}

// Watchers spawn children; terminate their process groups so Ctrl+C frees both ports.
export function serve(commands) {
  const children = [];
  let stopping = false;
  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    for (const child of children) {
      if (!child.pid) continue;
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
        } else {
          process.kill(-child.pid, 'SIGTERM');
        }
      } catch (error) {
        if (error.code !== 'ESRCH') console.error(error.message);
      }
    }
    process.exitCode = code;
  }
  process.once('SIGINT', () => stop());
  process.once('SIGTERM', () => stop());
  for (const { command, args, ...options } of commands) {
    const child = launch(command, args, {
      cwd: root,
      stdio: 'inherit',
      detached: process.platform !== 'win32',
      ...options,
    });
    children.push(child);
    child.once('error', (error) => {
      console.error(error.message);
      stop(1);
    });
    child.once('exit', (code) => {
      if (!stopping) stop(code ?? 1);
    });
  }
}
