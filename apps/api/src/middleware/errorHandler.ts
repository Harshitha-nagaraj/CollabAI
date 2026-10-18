import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Centralized Express error handler middleware.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Determine if error is an operational/app-specific error
  const isOperational = err instanceof AppError ? err.isOperational : false;
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = isOperational || env.NODE_ENV !== 'production' ? err.message : 'Internal Server Error';

  // Extract validation details if present
  const details = (err as any).details || undefined;

  // Log error using centralized logger
  if (statusCode >= 500) {
    logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);
  } else {
    logger.warn(`[Operational Error] ${req.method} ${req.originalUrl} (${statusCode}): ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(details && { details }),
      ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}
