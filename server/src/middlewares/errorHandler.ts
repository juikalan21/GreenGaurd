// import { Request, Response, NextFunction } from 'express';
// import logger from '../config/logger';
// import { env } from '../config/env';

// // Custom error class for API errors
// export class ApiError extends Error {
//   statusCode: number;
//   isOperational: boolean;

//   constructor(message: string, statusCode: number, isOperational: boolean = true) {
//     super(message);
//     this.statusCode = statusCode;
//     this.isOperational = isOperational;
    
//     Error.captureStackTrace(this, this.constructor);
//   }
// }

// // Handle 404 errors
// export const notFound = (req: Request, res: Response, next: NextFunction) => {
//   const error = new ApiError(`Not Found - ${req.originalUrl}`, 404);
//   next(error);
// };

// // Global error handler
// export const errorHandler = (
//   err: Error | ApiError,
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   // Log the error
//   logger.error(`Error: ${err.message}`);
//   logger.error(`Stack: ${err.stack}`);

//   // Default status code and message
//   let statusCode = 500;
//   let message = 'Server Error';
//   let errors: any[] = [];
//   let isOperational = false;

//   // Handle ApiError instances
//   if (err instanceof ApiError) {
//     statusCode = err.statusCode;
//     message = err.message;
//     isOperational = err.isOperational;
//   }

//   // Handle Mongoose validation errors
//   if (err.name === 'ValidationError' && typeof err === 'object' && err !== null) {
//     statusCode = 400;
//     message = 'Validation Error';
//     isOperational = true;
    
//     // Extract validation errors
//     const validationErrors = err as any;
//     if (validationErrors.errors) {
//       Object.keys(validationErrors.errors).forEach((key) => {
//         errors.push({
//           field: key,
//           message: validationErrors.errors[key].message,
//         });
//       });
//     }
//   }

//   // Handle Mongoose duplicate key errors
//   if (err.name === 'MongoError' && typeof err === 'object' && err !== null) {
//     const mongoError = err as any;
//     if (mongoError.code === 11000) {
//       statusCode = 400;
//       message = 'Duplicate field value entered';
//       isOperational = true;
//     }
//   }

//   // Handle JWT errors
//   if (err.name === 'JsonWebTokenError') {
//     statusCode = 401;
//     message = 'Invalid token';
//     isOperational = true;
//   }

//   if (err.name === 'TokenExpiredError') {
//     statusCode = 401;
//     message = 'Token expired';
//     isOperational = true;
//   }

//   // Send response
//   res.status(statusCode).json({
//     success: false,
//     message,
//     errors: errors.length > 0 ? errors : undefined,
//     stack: env.NODE_ENV === 'development' ? err.stack : undefined,
//   });
// };

// export default { ApiError, notFound, errorHandler };