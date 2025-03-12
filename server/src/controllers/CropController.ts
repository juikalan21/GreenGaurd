// src/controllers/CropController.ts
import { Request, Response, NextFunction } from 'express';
import cropService from '../services/cropService';

export const CropController = {
  // Create a new crop
  async createCrop(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { farmId, ...cropData } = req.body;
      // Assumes req.user is populated by authentication middleware
      const userId = req.user?.id;
      const crop = await cropService.createCrop(userId, farmId, cropData);
      return res.status(201).json({
        success: true,
        message: 'Crop created successfully',
        data: crop,
      });
    } catch (error) {
      next(error);
    }
  },

  // Upload and analyze crop image
  async uploadAndAnalyzeImage(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { cropId } = req.params;
      // The image file is expected in req.file (using multer or similar)
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }
      const crop = await cropService.uploadAndAnalyzeImage(cropId, file);
      return res.status(200).json({
        success: true,
        message: 'Crop image uploaded and analyzed successfully',
        data: crop,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update crop growth metrics
  async updateGrowthMetrics(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { cropId } = req.params;
      const metrics = req.body;
      const crop = await cropService.updateGrowthMetrics(cropId, metrics);
      return res.status(200).json({
        success: true,
        message: 'Growth metrics updated successfully',
        data: crop,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update weather impact information for a crop
  async updateWeatherImpact(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { cropId } = req.params;
      const weatherData = req.body;
      const crop = await cropService.updateWeatherImpact(cropId, weatherData);
      return res.status(200).json({
        success: true,
        message: 'Weather impact updated successfully',
        data: crop,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update or change the harvest plan for a crop
  async updateHarvestPlan(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { cropId } = req.params;
      const { status, updates } = req.body;
      const crop = await cropService.updateHarvestPlan(cropId, status, updates);
      return res.status(200).json({
        success: true,
        message: 'Harvest plan updated successfully',
        data: crop,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get crop details by cropId
  async getCrop(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { cropId } = req.params;
      const crop = await cropService.getCrop(cropId);
      return res.status(200).json({
        success: true,
        data: crop,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get paginated list of crops for a farm
  async getFarmCrops(req: Request, res: Response, next: NextFunction): Promise<any>{
    try {
      // FarmId can be provided as a URL parameter (e.g. /api/farms/:farmId/crops)
      const { farmId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await cropService.getFarmCrops(farmId, page, limit);
      return res.status(200).json({
        success: true,
        data: result.data,
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

  // Get crops that need attention (e.g. poor health, overdue inspection)
  async getCropsNeedingAttention(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      // Assumes the authenticated user id is available as req.user.id
      const userId = req.user?.id;
      const crops = await cropService.getCropsNeedingAttention(userId);
      return res.status(200).json({
        success: true,
        data: crops,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default CropController;