import jwt from 'jsonwebtoken';

// Generate JWT token
export const generateToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'fallbacksecret',
    { expiresIn: '24h' }
  );
};

// Verify JWT token
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallbacksecret');
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export default { generateToken, verifyToken };
