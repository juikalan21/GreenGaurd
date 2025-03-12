// src/controllers/UserController.ts
import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';

export const UserController = {
  // Register a new user
  async register(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userData = req.body;
      const result = await userService.registerUser(userData);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // Login user
  async login(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { phone, password } = req.body;
      const result = await userService.loginUser(phone, password);
      return res.status(200).json({
        success: true,
        message: 'User logged in successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get user by id
  async getUser(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.params.id;
      const user = await userService.getUserById(userId);
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update user profile (ensure req.user is populated by authentication middleware)
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id || req.params.id;
      const updateData = req.body;
      const updatedUser = await userService.updateUserProfile(userId, updateData);
      return res.status(200).json({
        success: true,
        message: 'User profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  // Change password (expected fields: currentPassword and newPassword)
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;
      const result = await userService.changePassword(userId, currentPassword, newPassword);
      return res.status(200).json({
        success: true,
        message: result ? 'Password changed successfully' : 'Failed to change password',
      });
    } catch (error) {
      next(error);
    }
  },

  // Upload profile picture; file should be available on req.file (e.g. via multer)
  async uploadProfilePicture(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }
      const updatedUser = await userService.uploadProfilePicture(userId, file);
      return res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  // Add a new farm to the user’s profile
  async addFarm(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const farmData = req.body;
      const updatedUser = await userService.addFarmDetails(userId, farmData);
      return res.status(200).json({
        success: true,
        message: 'Farm added successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update existing farm details – farmId is passed as a route parameter
  async updateFarm(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { farmId } = req.params;
      const updateData = req.body;
      const updatedUser = await userService.updateFarmDetails(userId, farmId, updateData);
      return res.status(200).json({
        success: true,
        message: 'Farm details updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete a farm from the user’s profile
  async deleteFarm(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { farmId } = req.params;
      const updatedUser = await userService.deleteFarm(userId, farmId);
      return res.status(200).json({
        success: true,
        message: 'Farm deleted successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  // Verify user (e.g. after registration or via OTP process)
  async verifyUser(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.params.id;
      const updatedUser = await userService.verifyUser(userId);
      return res.status(200).json({
        success: true,
        message: 'User verified successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default UserController;