import { parse } from 'shell-quote';
import type { AiProvider } from '../provider.js';
import { getSystemPrompt } from '../prompt.js';

export interface CliProviderConfig {
  cliCommand?: string;
}

type SpawnFn = typeof import('child_process').spawn;

export class CliProvider implements AiProvider {
  private readonly command: string;

  constructor(config: CliProviderConfig) {
    if (!config.cliCommand) {
      throw new Error('CLI provider requires a cliCommand');
    }
    this.command = config.cliCommand;
  }

  async execute(document: string, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) {
      throw new Error('Aborted');
    }

    let spawn: SpawnFn;
    try {
      // Use dynamic import to detect Node.js environment and allow test mocking
      const cp = await import('child_process');
      spawn = cp.spawn;
    } catch {
      throw new Error(
        'CLI provider requires Node.js/Electron environment (child_process not available)',
      );
    }

    const parsed = parse(this.command);
    if (parsed.some(p => typeof p !== 'string')) {
      throw new Error(
        'CLI command contains shell operators (&&, |, ;, etc.) which are not supported. ' +
        'Use a wrapper script instead.',
      );
    }
    const [cmd, ...args] = parsed as string[];

    const payload = getSystemPrompt() + '\n\n---\n\n' + document;

    return new Promise<string>((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

      let settled = false;
      const safeResolve = (val: string) => { if (!settled) { settled = true; resolve(val); } };
      const safeReject = (err: Error) => { if (!settled) { settled = true; reject(err); } };

      const cleanup = () => {
        if (signal) signal.removeEventListener('abort', onAbort);
      };

      const onAbort = () => {
        child.kill();
        safeReject(new Error('Aborted'));
        cleanup();
      };

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout.on('data', (data: Buffer) => {
        stdoutChunks.push(data);
      });

      child.stderr.on('data', (data: Buffer) => {
        stderrChunks.push(data);
      });

      child.on('error', (err: Error) => {
        safeReject(err);
        cleanup();
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          safeResolve(Buffer.concat(stdoutChunks).toString());
        } else {
          const stderr = Buffer.concat(stderrChunks).toString();
          safeReject(
            new Error(
              `CLI command exited with code ${code}: ${stderr}`,
            ),
          );
        }
        cleanup();
      });

      if (signal) {
        signal.addEventListener('abort', onAbort);
      }

      child.stdin.write(payload);
      child.stdin.end();
    });
  }
}
