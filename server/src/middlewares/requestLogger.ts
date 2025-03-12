// import { Request, Response, NextFunction } from 'express';
// import logger from '../config/logger';

// /**
//  * Middleware to log HTTP requests
//  */
// export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
//   const start = Date.now();
  
//   // Log request details
//   logger.http(`${req.method} ${req.originalUrl}`);
  
//   // Log request body in development
//   if (process.env.NODE_ENV === 'development' && req.body) {
//     // Don't log sensitive information like passwords
//     const sanitizedBody = { ...req.body };
//     if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
//     if (sanitizedBody.confirmPassword) sanitizedBody.confirmPassword = '[REDACTED]';
    
//     logger.debug(`Request Body: ${JSON.stringify(sanitizedBody)}`);
//   }
  
//   // Log response when finished
//   res.on('finish', () => {
//     const duration = Date.now() - start;
//     const contentLength = res.get('content-length') || 0;
    
//     logger.http(
//       `${req.method} ${req.originalUrl} ${res.statusCode} ${contentLength} - ${duration}ms`
//     );
//   });
  
//   next();
// };

// export default requestLogger;