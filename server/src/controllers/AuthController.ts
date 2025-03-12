// src/controllers/AuthController.ts
import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';

export const AuthController = {
  // Register a new user (sends OTP for phone verification)
  async register(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userData = req.body;
      const { user, otpId } = await authService.register(userData);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully. OTP sent for verification.',
        data: { user, otpId },
      });
    } catch (error) {
      next(error);
    }
  },

  // Verify a user's phone using OTP
  async verifyPhone(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { otpId, otpCode } = req.body;
      const { user, token } = await authService.verifyPhone(otpId, otpCode);
      return res.status(200).json({
        success: true,
        message: 'Phone verified successfully.',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  },

  // Login user
  async login(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { phone, password } = req.body;
      const { user, token } = await authService.login(phone, password);
      return res.status(200).json({
        success: true,
        message: 'User logged in successfully.',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  },

  // Initiate password reset (sends OTP)
  async initiatePasswordReset(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { phone } = req.body;
      const result = await authService.initiatePasswordReset(phone);
      return res.status(200).json({
        success: true,
        message: 'Password reset OTP sent successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // Reset password using OTP
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { otpId, otpCode, newPassword } = req.body;
      const success = await authService.resetPassword(otpId, otpCode, newPassword);
      return res.status(200).json({
        success: true,
        message: success ? 'Password reset successfully.' : 'Failed to reset password.',
      });
    } catch (error) {
      next(error);
    }
  },

  // Validate token (e.g. check if token is still valid)
  async validateToken(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided.',
        });
      }
      const user = await authService.validateToken(token);
      return res.status(200).json({
        success: true,
        message: 'Token is valid.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default AuthController;