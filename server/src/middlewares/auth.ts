import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Simple authentication middleware
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;
    
    // Get token from header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    
    // Add user ID to request
    req.user = { id: (decoded as any).id };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export default { protect };
