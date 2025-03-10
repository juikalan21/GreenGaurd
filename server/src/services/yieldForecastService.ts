import { YieldForecast, IYieldForecast } from '../models/YieldForecast';
import { User } from '../models/User';
import { CropData } from '../models/CropData';
import { SoilAnalysis } from '../models/SoilAnalysis';
import { WeatherData } from '../models/WeatherData';
import { ApiError } from '../middlewares/errorHandler';
import { aiService } from './aiService';
import { notificationService } from './notificationService';
import logger from '../config/logger';

/**
 * Service for handling yield forecasting
 */
export const yieldForecastService = {
  /**
   * Generate a new yield forecast
   */
  async generateYieldForecast(
    userId: string,
    farmId: string,
    cropDataId: string
  ): Promise<IYieldForecast> {
    try {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError('User not found', 404);
      }

      // Check if farm exists
      const farm = user.farmDetails.find(farm => farm._id && farm._id.toString() === farmId);
      if (!farm) {
        throw new ApiError('Farm not found', 404);
      }

      // Get crop data
      const cropData = await CropData.findOne({ _id: cropDataId, userId });
      if (!cropData) {
        throw new ApiError('Crop data not found', 404);
      }

      // Get latest soil analysis
      const soilAnalysis = await SoilAnalysis.findOne({ userId, farmId }).sort({ createdAt: -1 });
      if (!soilAnalysis) {
        throw new ApiError('No soil analysis found for this farm', 404);
      }

      // Get latest weather data
      const weatherData = await WeatherData.findOne({ userId }).sort({ createdAt: -1 });
      if (!weatherData) {
        throw new ApiError('No weather data found for this user', 404);
      }

      // Get historical yield data for this crop 
      // Note: We're assuming YieldForecast documents have the correct structure
      // even if the interface doesn't match what we've been trying to use
      const historicalYields = await YieldForecast.find({
        userId,
        cropName: cropData.cropName,
      }).sort({ createdAt: -1 }).limit(5);

      // Prepare historical data for AI service
      // Using type assertion to avoid TypeScript errors
      const historicalData = {
        historicalYields: historicalYields.map(y => ({
          amount: y.yieldEstimate?.amount,
          unit: y.yieldEstimate?.unit,
          yieldPerArea: y.yieldEstimate?.yieldPerArea,
          harvestDate: y.expectedHarvestDate,
        })),
        farmSize: farm.size,
        farmLocation: user.location,
        cropType: cropData.cropType,
        plantingDate: cropData.plantingDate
      };

      // Generate yield forecast using AI
      const aiYieldResult = await aiService.generateYieldForecast(
        cropData,
        soilAnalysis,
        weatherData,
        historicalData
      );

      // Create yield forecast based on model structure
      const yieldForecast = await YieldForecast.create({
        userId: userId,
        farmId: farmId,
        cropDataId: cropDataId,
        soilAnalysisId: soilAnalysis._id,
        weatherDataId: weatherData._id,
        cropName: cropData.cropName,
        plantingDate: cropData.plantingDate,
        expectedHarvestDate: cropData.expectedHarvestDate,
        forecastDate: new Date(),
        forecastPeriod: 'mid_term',  // Default to mid-term
        yieldEstimate: {
          amount: aiYieldResult.yieldEstimate?.amount || 0,
          unit: aiYieldResult.yieldEstimate?.unit || 'kg',
          confidenceLevel: aiYieldResult.yieldEstimate?.confidenceLevel || 50,
          yieldPerArea: aiYieldResult.yieldEstimate?.yieldPerArea || 0,
          areaUnit: 'acre'
        },
        historicalComparison: {
          previousYield: aiYieldResult.comparisonWithHistorical?.previousYield || 0,
          percentageChange: aiYieldResult.comparisonWithHistorical?.percentageChange || 0,
          seasonalAverage: aiYieldResult.comparisonWithHistorical?.seasonalAverage || 0
        },
        influencingFactors: {
          weather: {
            impact: aiYieldResult.influencingFactors?.weather?.impact || 'neutral',
            details: aiYieldResult.influencingFactors?.weather?.details || 'No data available',
            riskLevel: aiYieldResult.influencingFactors?.weather?.riskLevel || 'low'
          },
          soil: {
            impact: aiYieldResult.influencingFactors?.soil?.impact || 'neutral',
            details: aiYieldResult.influencingFactors?.soil?.details || 'No data available',
            riskLevel: aiYieldResult.influencingFactors?.soil?.riskLevel || 'low'
          },
          pests: {
            impact: aiYieldResult.influencingFactors?.pests?.impact || 'neutral',
            details: aiYieldResult.influencingFactors?.pests?.details || 'No data available',
            riskLevel: aiYieldResult.influencingFactors?.pests?.riskLevel || 'low'
          },
          diseases: {
            impact: aiYieldResult.influencingFactors?.diseases?.impact || 'neutral',
            details: aiYieldResult.influencingFactors?.diseases?.details || 'No data available',
            riskLevel: aiYieldResult.influencingFactors?.diseases?.riskLevel || 'low'
          },
          management: {
            impact: aiYieldResult.influencingFactors?.management?.impact || 'neutral',
            details: aiYieldResult.influencingFactors?.management?.details || 'No data available',
            improvementSuggestions: aiYieldResult.influencingFactors?.management?.improvementSuggestions || []
          }
        },
        marketProjection: {
          estimatedPrice: {
            amount: aiYieldResult.marketProjection?.estimatedPrice?.amount || 0,
            currency: aiYieldResult.marketProjection?.estimatedPrice?.currency || 'INR'
          },
          demandTrend: aiYieldResult.marketProjection?.demandTrend || 'stable',
          potentialRevenue: aiYieldResult.marketProjection?.potentialRevenue || 0
        },
        optimizationRecommendations: {
          fertilizer: aiYieldResult.optimizationRecommendations?.fertilizer || [],
          irrigation: aiYieldResult.optimizationRecommendations?.irrigation || [],
          pestControl: aiYieldResult.optimizationRecommendations?.pestControl || [],
          harvestTiming: aiYieldResult.optimizationRecommendations?.harvestTiming || 'Optimal harvest timing not available',
          potentialYieldIncrease: aiYieldResult.optimizationRecommendations?.potentialYieldIncrease || 0
        },
        aiAnalysis: aiYieldResult.analysis || 'No analysis available'
      });

      // Create notification for new yield forecast
      await notificationService.createNotification({
        userId,
        title: 'New Yield Forecast Available',
        message: `AI-generated yield forecast for your ${cropData.cropName} is now available. Estimated yield: ${yieldForecast.yieldEstimate.amount} ${yieldForecast.yieldEstimate.unit}.`,
        type: 'info',
        category: 'crop',
        priority: 'medium',
        actionRequired: false,
        relatedEntityType: 'crop', // Changed from 'yieldForecast' to 'crop' to match allowed values
        relatedEntityId: (yieldForecast._id as string).toString(),
      });

      logger.info(`Yield forecast generated for crop: ${cropDataId}`);
      return yieldForecast;
    } catch (error) {
      logger.error(`Generate yield forecast error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Get yield forecast by ID
   */
  async getYieldForecast(forecastId: string, userId: string): Promise<IYieldForecast> {
    try {
      const yieldForecast = await YieldForecast.findById(forecastId);
      if (!yieldForecast) {
        throw new ApiError('Yield forecast not found', 404);
      }

      // Check if user owns this forecast
      if (yieldForecast.userId.toString() !== userId) {
        throw new ApiError('Not authorized to access this yield forecast', 403);
      }

      return yieldForecast;
    } catch (error) {
      logger.error(`Get yield forecast error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Get all yield forecasts for a user
   */
  async getUserYieldForecasts(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    forecasts: IYieldForecast[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const forecasts = await YieldForecast.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await YieldForecast.countDocuments({ userId });

      return {
        forecasts,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error(`Get user yield forecasts error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Get yield forecasts for a specific crop
   */
  async getCropYieldForecasts(
    userId: string,
    cropDataId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    forecasts: IYieldForecast[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const forecasts = await YieldForecast.find({ userId, cropDataId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await YieldForecast.countDocuments({ userId, cropDataId });

      return {
        forecasts,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error(`Get crop yield forecasts error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Update yield estimate after reassessment
   * Note: This is different from the original 'updateActualYield' method
   * as the YieldForecast model doesn't have an 'actualYield' field
   */
  async updateYieldEstimate(
    forecastId: string,
    userId: string,
    updatedEstimate: {
      amount: number;
      unit: string;
      confidenceLevel: number;
      yieldPerArea: number;
      areaUnit: string;
    }
  ): Promise<IYieldForecast> {
    try {
      const yieldForecast = await YieldForecast.findById(forecastId);
      if (!yieldForecast) {
        throw new ApiError('Yield forecast not found', 404);
      }

      // Check if user owns this forecast
      if (yieldForecast.userId.toString() !== userId) {
        throw new ApiError('Not authorized to update this yield forecast', 403);
      }

      // Update yield estimate
      yieldForecast.yieldEstimate = {
        amount: updatedEstimate.amount,
        unit: updatedEstimate.unit,
        confidenceLevel: updatedEstimate.confidenceLevel,
        yieldPerArea: updatedEstimate.yieldPerArea,
        areaUnit: updatedEstimate.areaUnit,
      };

      // Update the record's timestamp
      yieldForecast.updatedAt = new Date();
      await yieldForecast.save();

      logger.info(`Yield estimate updated for forecast: ${forecastId}`);
      return yieldForecast;
    } catch (error) {
      logger.error(`Update yield estimate error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
};

export default yieldForecastService;
