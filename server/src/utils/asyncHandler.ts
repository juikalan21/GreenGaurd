import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Wrapper for async route handlers to catch errors
 * Eliminates the need for try/catch blocks in every controller
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error(`AsyncHandler caught error: ${error.message}`);
      next(error);
    });
  };
};

export default asyncHandler;