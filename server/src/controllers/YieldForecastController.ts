// src/controllers/YieldForecastController.ts
import { Request, Response, NextFunction } from 'express';
import yieldForecastService from '../services/yieldForecastService';

export const YieldForecastController = {
  // Generate a new yield forecast
  async generateForecast(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { farmId, cropId } = req.body;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const forecast = await yieldForecastService.generateForecast(userId, farmId, cropId);
      return res.status(201).json({
        success: true,
        message: 'Yield forecast generated successfully',
        data: forecast,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get a specific yield forecast by its ID
  async getForecast(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const forecast = await yieldForecastService.getForecast(id, userId);
      return res.status(200).json({
        success: true,
        data: forecast,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get a list of yield forecasts with pagination and filters
  async getForecasts(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const query: { userId: string; farmId?: string; cropId?: string } = { userId };
      if (req.query.farmId) {
        query.farmId = req.query.farmId as string;
      }
      if (req.query.cropId) {
        query.cropId = req.query.cropId as string;
      }
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await yieldForecastService.getForecasts(query, page, limit);
      return res.status(200).json({
        success: true,
        data: result.forecasts,
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

  // Get yield trends for a given farm and crop
  async getTrends(req: Request, res: Response, next: NextFunction) : Promise<any>{
    try {
      const { farmId, cropId } = req.query;
      if (!farmId || !cropId) {
        return res.status(400).json({ success: false, message: 'farmId and cropId are required' });
      }
      const trends = await yieldForecastService.getTrends(farmId as string, cropId as string);
      return res.status(200).json({
        success: true,
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default YieldForecastController;