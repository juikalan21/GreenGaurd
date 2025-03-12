// src/controllers/WeatherController.ts
import { Request, Response, NextFunction } from 'express';
import weatherService from '../services/weatherService';

export const WeatherController = {
  // Trigger fetching and storing weather data based on user location
  async fetchWeather(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      // Optionally pass farmId from body or query if applicable
      const farmId = req.body.farmId || req.query.farmId;
      const result = await weatherService.fetchAndStoreWeatherData(userId, farmId as string);
      return res.status(200).json({
        success: true,
        message: 'Weather data fetched and stored successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get the latest weather data for the user (or specific farm)
  async getLatestWeather(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const farmId = (req.query.farmId as string) || 'default';
      const weatherData = await weatherService.getLatestWeatherData(userId, farmId);
      return res.status(200).json({
        success: true,
        data: weatherData,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get weather data along with agricultural recommendations
  async getWeatherRecommendations(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const farmId = (req.query.farmId as string) || 'default';
      const { weather, recommendations } = await weatherService.getWeatherWithRecommendations(userId, farmId);
      return res.status(200).json({
        success: true,
        data: { weather, recommendations },
      });
    } catch (error) {
      next(error);
    }
  },

  // Get historical weather data with pagination
  async getHistoricalWeather(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const farmId = req.query.farmId as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await weatherService.getHistoricalData(userId, page, limit, farmId);
      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default WeatherController;