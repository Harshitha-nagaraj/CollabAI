import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors.js';

/**
 * Higher-order middleware to validate the request body against a Zod schema.
 */
export function validateBody(schema: ZodSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Collect detailed error messages
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        // Pass a BadRequestError to the centralized error handler
        const badReqErr = new BadRequestError('Validation failed');
        (badReqErr as any).details = details;
        next(badReqErr);
      } else {
        next(error);
      }
    }
  };
}
