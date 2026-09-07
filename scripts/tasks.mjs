import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { root, npm, run, serve } from './process.mjs';

const api = join(root, 'src/api');
const output = join(root, 'artifacts/app');
const apiPort = process.env.API_PORT ?? '5080';
const webPort = process.env.WEB_PORT ?? '5173';
const apiUrl = `http://127.0.0.1:${apiPort}`;
const web = (...args) => run(npm, ['run', ...args, '--workspace', '@pharo/web']);

async function contracts(check = false) {
  const schemaPath = join(root, 'contracts/openapi.json');
  const typesPath = join(root, 'src/web/src/api/schema.d.ts');
  const beforeSchema = check ? await readFile(schemaPath, 'utf8') : null;
  await run('dotnet', ['build', api, '--no-restore']);
  const destination = check ? join(root, 'artifacts/schema-check.d.ts') : typesPath;
  await mkdir(join(root, 'artifacts'), { recursive: true });
  await run(npm, ['exec', '--', 'openapi-typescript', schemaPath, '-o', destination]);
  if (
    check &&
    (beforeSchema !== (await readFile(schemaPath, 'utf8')) ||
      (await readFile(typesPath, 'utf8')) !== (await readFile(destination, 'utf8')))
  ) {
    throw new Error(
      'API contracts are out of date. Run npm run contracts and include both generated files.',
    );
  }
}

async function tests() {
  await run('dotnet', ['test', 'Pharo.sln', '--no-restore']);
  await web('test');
}

try {
  switch (process.argv[2]) {
    case 'dev':
      serve([
        {
          command: 'dotnet',
          args: ['watch', '--project', api, '--non-interactive', '--no-launch-profile'],
          env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', ASPNETCORE_URLS: apiUrl },
        },
        {
          command: npm,
          args: [
            'run',
            'dev',
            '--workspace',
            '@pharo/web',
            '--',
            '--host',
            '127.0.0.1',
            '--port',
            webPort,
            '--strictPort',
          ],
          env: { ...process.env, API_PROXY_TARGET: apiUrl },
        },
      ]);
      break;
    case 'build':
      await run('dotnet', ['restore', 'Pharo.sln', '--locked-mode']);
      await contracts(true);
      await web('build');
      await rm(output, { recursive: true, force: true });
      await run('dotnet', ['publish', api, '-c', 'Release', '--no-restore', '-o', output]);
      await cp(join(root, 'src/web/dist'), join(output, 'wwwroot'), { recursive: true });
      console.log('Built artifacts/app. Run npm start to serve the complete application.');
      break;
    case 'start':
      serve([
        {
          command: 'dotnet',
          args: ['Pharo.Api.dll', '--urls', apiUrl],
          cwd: output,
          env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Production' },
        },
      ]);
      break;
    case 'check':
      await run('dotnet', ['restore', 'Pharo.sln', '--locked-mode']);
      await run(npm, ['run', 'format:check']);
      await run('dotnet', ['format', 'Pharo.sln', '--verify-no-changes', '--no-restore']);
      await contracts(true);
      await web('lint');
      await web('typecheck');
      await tests();
      break;
    case 'test':
      await run('dotnet', ['restore', 'Pharo.sln', '--locked-mode']);
      await tests();
      break;
    case 'contracts':
    case 'contracts-check':
      await run('dotnet', ['restore', 'Pharo.sln', '--locked-mode']);
      await contracts(process.argv[2] === 'contracts-check');
      break;
    default:
      throw new Error('Unknown task. Use an npm script from the repository root.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
