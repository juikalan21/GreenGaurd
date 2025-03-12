// src/controllers/CropRecommendationController.ts
import { Request, Response, NextFunction } from 'express';
import cropRecommendationService from '../services/cropRecommendationService';

export const CropRecommendationController = {
  // Generate new crop recommendations
  async generateRecommendation(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const userId = req.user?.id;
      const { farmId, preferences } = req.body; // preferences should follow the CropPreferences interface
      const recommendation = await cropRecommendationService.generateCropRecommendations(userId, farmId, preferences);
      return res.status(201).json({
        success: true,
        message: 'Crop recommendations generated successfully',
        data: recommendation,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get a specific crop recommendation by its ID
  async getRecommendation(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const userId = req.user?.id;
      const { recommendationId } = req.params;
      const recommendation = await cropRecommendationService.getCropRecommendation(recommendationId, userId);
      return res.status(200).json({
        success: true,
        data: recommendation,
      });
    } catch (error) {
      next(error);
    }
  },

  // List crop recommendations for the authenticated user with pagination
  async getUserRecommendations(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const userId = req.user?.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await cropRecommendationService.getUserCropRecommendations(userId, page, limit);
      return res.status(200).json({
        success: true,
        data: result.recommendations,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // List crop recommendations for a specific farm with pagination
  async getFarmRecommendations(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const userId = req.user?.id;
      const { farmId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await cropRecommendationService.getFarmCropRecommendations(userId, farmId, page, limit);
      return res.status(200).json({
        success: true,
        data: result.recommendations,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Update recommendation preferences
  async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const userId = req.user?.id;
      const { recommendationId } = req.params;
      const preferences = req.body; // Partial preferences object
      const updatedRecommendation = await cropRecommendationService.updatePreferences(recommendationId, userId, preferences);
      return res.status(200).json({
        success: true,
        message: 'Recommendation preferences updated successfully',
        data: updatedRecommendation,
      });
    } catch (error) {
      next(error);
    }
  },

  // Select a recommended crop from the generated recommendations
  async selectRecommendedCrop(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const userId = req.user?.id;
      const { recommendationId } = req.params;
      const { cropName, notes } = req.body;
      const updatedRecommendation = await cropRecommendationService.selectRecommendedCrop(recommendationId, userId, cropName, notes);
      return res.status(200).json({
        success: true,
        message: 'Crop recommendation updated with selected crop',
        data: updatedRecommendation,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default CropRecommendationController;