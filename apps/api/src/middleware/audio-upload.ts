/**
 * @file middleware/audio-upload.ts
 *
 * Multer middleware for recorded meeting audio upload.
 * - Stores files outside public serving directories (storage/temp-audio).
 * - Enforces cryptographically random filenames to prevent path traversal.
 * - Restricts accepted file extensions and MIME types.
 * - Enforces strict file size limits (50 MB default).
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';

// Target directory outside publicly served directories
export const AUDIO_TEMP_DIR = path.resolve(process.cwd(), 'storage', 'temp-audio');

// Ensure directory exists
if (!fs.existsSync(AUDIO_TEMP_DIR)) {
  fs.mkdirSync(AUDIO_TEMP_DIR, { recursive: true });
}

// 50 MB default limit (customizable via env var)
export const MAX_AUDIO_FILE_SIZE_BYTES = parseInt(
  process.env.MAX_AUDIO_FILE_SIZE_BYTES || String(50 * 1024 * 1024),
  10
);

const ALLOWED_EXTENSIONS = new Set([
  '.wav',
  '.mp3',
  '.m4a',
  '.ogg',
  '.webm',
  '.flac',
  '.aac',
]);

const ALLOWED_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/webm',
  'video/webm', // WebM audio often identified as video/webm in some browsers
  'audio/ogg',
  'application/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
]);

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    if (!fs.existsSync(AUDIO_TEMP_DIR)) {
      fs.mkdirSync(AUDIO_TEMP_DIR, { recursive: true });
    }
    cb(null, AUDIO_TEMP_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Generate clean extension from original filename
    const originalExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(originalExt) ? originalExt : '.wav';
    // Use cryptographic random UUID to prevent any path traversal or filename collision
    const randomName = `audio-${crypto.randomUUID()}${safeExt}`;
    cb(null, randomName);
  },
});

export const audioUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_AUDIO_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    // Check extension and mime type
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const allowedList = Array.from(ALLOWED_EXTENSIONS).join(', ');
      return cb(
        new Error(
          `Unsupported audio format '${ext}'. Allowed formats: ${allowedList}`
        )
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mime) && !mime.startsWith('audio/')) {
      return cb(
        new Error(
          `Invalid file MIME type '${file.mimetype}'. Only audio files are accepted.`
        )
      );
    }

    cb(null, true);
  },
});
