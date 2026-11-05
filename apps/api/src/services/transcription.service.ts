/**
 * @file services/transcription.service.ts
 *
 * Local Speech-to-Text Transcription Service using local Whisper.
 * Executes worker without shell injection, enforces timeouts,
 * cleans up temporary files, and returns structured transcripts.
 */

import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  success: boolean;
  transcript: string;
  duration?: number;
  language?: string;
  languageProbability?: number;
  model?: string;
  segmentsCount?: number;
  segments?: TranscriptionSegment[];
  error?: string;
  errorType?: string;
}

export class TranscriptionService {
  /**
   * Resolve path to the Python transcription worker.
   */
  private static getWorkerPath(): string {
    // Check multiple potential locations
    const candidates = [
      path.resolve(process.cwd(), 'workers', 'transcribe.py'),
      path.resolve(process.cwd(), 'apps', 'api', 'workers', 'transcribe.py'),
      path.resolve(__dirname, '..', '..', 'workers', 'transcribe.py'),
      path.resolve(__dirname, '..', 'workers', 'transcribe.py'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Default to the first candidate if none found yet
    return candidates[0]!;
  }

  /**
   * Resolve Python executable to run.
   */
  private static getPythonExecutable(): string {
    return process.env.PYTHON_PATH || 'python';
  }

  /**
   * Safely execute local Python Whisper worker without shell interpolation.
   */
  static async transcribeAudioFile(
    filePath: string,
    options?: {
      model?: string | undefined;
      language?: string | undefined;
      timeoutMs?: number | undefined;
      maxDurationSeconds?: number | undefined;
    }
  ): Promise<TranscriptionResult> {
    const normalizedFilePath = path.resolve(filePath);

    if (!fs.existsSync(normalizedFilePath)) {
      throw new Error(`Audio file does not exist at path: ${normalizedFilePath}`);
    }

    const workerPath = this.getWorkerPath();
    if (!fs.existsSync(workerPath)) {
      throw new Error(`Python transcription worker script not found at: ${workerPath}`);
    }

    const pythonBin = this.getPythonExecutable();
    const model = options?.model || process.env.WHISPER_MODEL || 'tiny';
    const timeoutMs = options?.timeoutMs || 600000; // 10 minutes default
    const maxDurationSeconds = options?.maxDurationSeconds || 7200; // 2 hours default

    const args: string[] = [
      workerPath,
      '--file',
      normalizedFilePath,
      '--model',
      model,
      '--max-duration',
      String(maxDurationSeconds),
    ];

    if (options?.language) {
      args.push('--language', options.language);
    }

    return new Promise<TranscriptionResult>((resolve, reject) => {
      let stdoutData = '';
      let stderrData = '';
      let isTimedOut = false;

      // Spawn process directly without shell: args array prevents command injection
      const proc = spawn(pythonBin, args, {
        shell: false,
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        isTimedOut = true;
        try {
          proc.kill('SIGKILL');
        } catch (e) {
          logger.warn('Failed to kill timed out worker process', e);
        }
        reject(
          new Error(
            `Audio transcription timed out after ${Math.round(timeoutMs / 1000)} seconds.`
          )
        );
      }, timeoutMs);

      proc.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString('utf-8');
      });

      proc.stderr.on('data', (chunk) => {
        stderrData += chunk.toString('utf-8');
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        if (isTimedOut) return;
        logger.error('Failed to spawn transcription worker process', { err });
        reject(new Error(`Failed to execute Python transcription worker: ${err.message}`));
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (isTimedOut) return;

        if (code !== 0 && !stdoutData.trim()) {
          logger.error('Transcription worker process exited with error', {
            code,
            stderr: stderrData,
          });
          return reject(
            new Error(
              `Transcription worker failed (exit code ${code}): ${
                stderrData.trim() || 'Unknown error during audio processing'
              }`
            )
          );
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          if (!parsed.success) {
            return reject(
              new Error(parsed.error || 'Transcription worker returned unsuccessful status')
            );
          }

          resolve({
            success: true,
            transcript: parsed.transcript || '',
            duration: parsed.duration,
            language: parsed.language,
            languageProbability: parsed.language_probability,
            model: parsed.model || model,
            segmentsCount: parsed.segments_count || (parsed.segments ? parsed.segments.length : 0),
            segments: parsed.segments || [],
          });
        } catch (parseError: any) {
          logger.error('Failed to parse JSON response from transcription worker', {
            stdout: stdoutData,
            stderr: stderrData,
            parseError: parseError.message,
          });
          reject(
            new Error(
              `Invalid JSON returned by transcription worker: ${
                stdoutData.slice(0, 200) || stderrData.slice(0, 200)
              }`
            )
          );
        }
      });
    });
  }

  /**
   * Safely remove a temporary audio file from disk.
   */
  static cleanupTempFile(filePath?: string | null): void {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err: any) {
      logger.warn(`Could not remove temporary audio file: ${filePath}`, err.message);
    }
  }
}
