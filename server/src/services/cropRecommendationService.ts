import { CropRecommendation, ICropRecommendation } from '../models/CropRecommendation';
import { User } from '../models/User';
import { SoilAnalysis } from '../models/SoilAnalysis';
import { WeatherData } from '../models/WeatherData';
import aiService from './aiService';
import { notificationService } from './notificationService';
//import { analyzeImageWithAI } from './aiService';

interface CropPreferences {
  cropTypes: string[];
  budget: number;
  marketFocus: 'local' | 'export' | 'both';
  farmingExperience: 'beginner' | 'intermediate' | 'advanced';
  sustainabilityFocus: boolean;
  laborAvailability: 'low' | 'medium' | 'high';
  mechanizationLevel: 'low' | 'medium' | 'high';
  riskTolerance: 'low' | 'medium' | 'high';
}

export const cropRecommendationService = {
  async generateCropRecommendations(
    userId: string,
    farmId: string,
    preferences: CropPreferences
  ): Promise<ICropRecommendation> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const farm = user.farmDetails.find(farm => farm?._id?.toString() === farmId);
    if (!farm) throw new Error('Farm not found');

    const [soilAnalysis, weatherData] = await Promise.all([
      SoilAnalysis.findOne({ userId, farmId }).sort({ createdAt: -1 }),
      WeatherData.findOne({ userId }).sort({ createdAt: -1 })
    ]);

    if (!soilAnalysis) throw new Error('No soil analysis found');
    if (!weatherData) throw new Error('No weather data found');

    const aiRecommendationsResult = await aiService.generateCropRecommendations(
      soilAnalysis,
      weatherData,
      preferences,
      user.location
    );

    const cropRecommendation = await CropRecommendation.create({
      userId,
      farmId,
      soilAnalysisId: soilAnalysis._id,
      weatherDataId: weatherData._id,
      preferences,
      recommendations: aiRecommendationsResult.recommendations || [],
      analysis: aiRecommendationsResult.analysis,
      seasonality: aiRecommendationsResult.seasonality || {},
      marketInsights: aiRecommendationsResult.marketInsights || {},
      sustainabilityScore: aiRecommendationsResult.sustainabilityScore || 0,
    });

    await notificationService.createNotification({
      userId,
      title: 'New Crop Recommendations Available',
      message: 'AI-generated crop recommendations for your farm are now available.',
      type: 'info',
      category: 'crop',
      priority: 'medium',
      actionRequired: false,
      relatedEntityType: 'crop',
      relatedEntityId: cropRecommendation.userId.toString()
    });

    return cropRecommendation;
  },

  async getCropRecommendation(recommendationId: string, userId: string): Promise<ICropRecommendation> {
    const cropRecommendation = await CropRecommendation.findById(recommendationId);
    if (!cropRecommendation) throw new Error('Crop recommendation not found');
    if (cropRecommendation.userId.toString() !== userId) throw new Error('Not authorized');
    return cropRecommendation;
  },

  async getUserCropRecommendations(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [recommendations, total] = await Promise.all([
      CropRecommendation.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CropRecommendation.countDocuments({ userId })
    ]);

    return { recommendations, total, page, limit };
  },

  async getFarmCropRecommendations(userId: string, farmId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [recommendations, total] = await Promise.all([
      CropRecommendation.find({ userId, farmId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CropRecommendation.countDocuments({ userId, farmId })
    ]);

    return { recommendations, total, page, limit };
  },

  async updatePreferences(
    recommendationId: string,
    userId: string,
    preferences: Partial<CropPreferences>
  ): Promise<ICropRecommendation> {
    const cropRecommendation = await CropRecommendation.findById(recommendationId);
    if (!cropRecommendation) throw new Error('Crop recommendation not found');
    if (cropRecommendation.userId.toString() !== userId) throw new Error('Not authorized');

    Object.assign(cropRecommendation.preferences, preferences);
    await cropRecommendation.save();
    return cropRecommendation;
  },

  async selectRecommendedCrop(
    recommendationId: string,
    userId: string,
    cropName: string,
    notes?: string
  ): Promise<ICropRecommendation> {
    const cropRecommendation = await CropRecommendation.findById(recommendationId);
    if (!cropRecommendation) throw new Error('Crop recommendation not found');
    if (cropRecommendation.userId.toString() !== userId) throw new Error('Not authorized');

    const recommendedCrop = cropRecommendation.recommendations.find(
      crop => crop.cropName.toLowerCase() === cropName.toLowerCase()
    );
    if (!recommendedCrop) throw new Error('Crop not found in recommendations');

    cropRecommendation.selectedCrop = {
      ...recommendedCrop,
      selectedAt: new Date(),
      status: 'pending'
    };

    await cropRecommendation.save();
    return cropRecommendation;
  }
};

export default cropRecommendationService;
