// src/services/cropService.ts
import { CropData, ICropData } from '../models/CropData';
import { User } from '../models/User';
import { processAndUploadImage } from '../utils/imageProcessor';
import { analyzeImageWithAI } from './aiService';
//import { notificationService } from './notificationService';

// Types
interface CreateCropInput {
  cropName: string;
  cropType: string;
  plantingDate: Date;
  expectedHarvestDate?: Date;
  growthStage: string;
  harvestPlan?: {
    estimatedYield: number;
    harvestWindow: {
      start: Date;
      end: Date;
    };
    equipment: string[];
    laborNeeded: number;
  };
}

interface GrowthMetricsInput {
  height?: number;
  leafCount?: number;
  measurement: number;
  notes: string;
}

interface WeatherImpactInput {
  conditions: string;
  risks: string[];
  adaptations: string[];
}

interface PaginationResult {
  data: ICropData[];
  total: number;
  page: number;
  limit: number;
}

class CropService {
  // Create new crop
  async createCrop(userId: string, farmId: string, cropData: CreateCropInput): Promise<ICropData> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const farm = user.farms.find((farm:any) => farm && farm._id.toString() === farmId);
    if (!farm) throw new Error('Farm not found');

    const crop = await CropData.create({
      userId,
      farmId,
      ...cropData,
      healthStatus: {
        overall: 'good',
        issues: []
      },
      growthMetrics: {
        growth: []
      },
      weatherImpact: {
        lastAssessment: new Date(),
        conditions: 'normal',
        risks: [],
        adaptations: []
      },
      recommendations: {
        actions: ['Initial soil testing recommended', 'Set up irrigation schedule']
      },
      harvestPlan: {
        ...cropData.harvestPlan,
        status: 'planned'
      },
      lastInspection: new Date(),
      nextInspectionDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    // Update farm's current crops
    if (farm.crops && !farm.crops.includes(cropData.cropName)) {
      farm.crops.push(cropData.cropName);
      await user.save();
    }

    //await this.notifyNewCrop(crop);
    return crop;
  }

  // Upload and analyze crop image
  async uploadAndAnalyzeImage(cropId: string, file: Express.Multer.File): Promise<ICropData> {
    const crop = await CropData.findById(cropId);
    if (!crop) throw new Error('Crop not found');

    // Process and upload image
    const imageUrl = await processAndUploadImage(file, `crops/${crop.userId}`, {
      width: 800,
      quality: 80
    });

    // Update crop with image
    crop.imageUrl = imageUrl;
    
    // Analyze image with AI
    const analysis = await analyzeImageWithAI(imageUrl, 'crop_health', {
      cropName: crop.cropName,
      cropType: crop.cropType,
      growthStage: crop.growthStage
    });

    // Update crop with analysis results
    await this.updateCropHealth(crop, analysis);
    
    return crop;
  }

  // Update crop health status
  async updateCropHealth(crop: ICropData, analysis: any): Promise<void> {
    crop.healthStatus.overall = analysis.health;
    
    // Add new issues if found
    if (analysis.issues?.length) {
      const newIssues = analysis.issues.map((issue:any) => ({
        type: issue.type,
        name: issue.name,
        severity: issue.severity,
        detectedAt: new Date(),
        resolved: false
      }));

      crop.healthStatus.issues.push(...newIssues);

      // Notify about serious issues
      // for (const issue of newIssues) {
      //   if (issue.severity === 'high') {
      //     await this.notifyHealthIssue(crop, issue);
      //   }
      // }
    }

    // Update recommendations
    crop.recommendations = {
      ...crop.recommendations,
      ...analysis.recommendations
    };

    crop.aiAnalysis = analysis.summary;
    crop.lastInspection = new Date();
    
    await crop.save();
  }

  // Update growth metrics
  async updateGrowthMetrics(cropId: string, metrics: GrowthMetricsInput): Promise<ICropData> {
    const crop = await CropData.findById(cropId);
    if (!crop) throw new Error('Crop not found');

    if (metrics.height) crop.growthMetrics.height = metrics.height;
    if (metrics.leafCount) crop.growthMetrics.leafCount = metrics.leafCount;

    crop.growthMetrics.growth.push({
      date: new Date(),
      measurement: metrics.measurement,
      notes: metrics.notes
    });

    await crop.save();
    return crop;
  }

  // Update weather impact
  async updateWeatherImpact(cropId: string, weatherData: WeatherImpactInput): Promise<ICropData> {
    const crop = await CropData.findById(cropId);
    if (!crop) throw new Error('Crop not found');

    crop.weatherImpact = {
      lastAssessment: new Date(),
      ...weatherData
    };

    await crop.save();
    return crop;
  }

  // Update harvest plan
  async updateHarvestPlan(
    cropId: string, 
    status: 'planned' | 'in_progress' | 'completed',
    updates?: Partial<ICropData['harvestPlan']>
  ): Promise<ICropData> {
    const crop = await CropData.findById(cropId);
    if (!crop) throw new Error('Crop not found');

    crop.harvestPlan = {
      ...crop.harvestPlan,
      ...updates,
      status
    };

    await crop.save();
    return crop;
  }

  // Get crop details
  async getCrop(cropId: string): Promise<ICropData> {
    const crop = await CropData.findById(cropId);
    if (!crop) throw new Error('Crop not found');
    return crop;
  }

  // Get all crops for a farm
  async getFarmCrops(
    farmId: string,
    page = 1,
    limit = 10
  ): Promise<PaginationResult> {
    const skip = (page - 1) * limit;

    const [crops, total] = await Promise.all([
      CropData.find({ farmId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CropData.countDocuments({ farmId })
    ]);

    return {
      data: crops,
      total,
      page,
      limit
    };
  }

  // Get crops needing attention
  async getCropsNeedingAttention(userId: string): Promise<ICropData[]> {
    return CropData.find({
      userId,
      $or: [
        { 'healthStatus.overall': { $in: ['poor', 'critical'] } },
        { 'healthStatus.issues': { $elemMatch: { resolved: false, severity: 'high' } } },
        { nextInspectionDue: { $lte: new Date() } }
      ]
    }).sort({ nextInspectionDue: 1 });
  }

  // // Private notification methods
  // private async notifyNewCrop(crop: ICropData): Promise<void> {
  //   await notificationService.createNotification({
  //     userId: crop.userId.toString(),
  //     title: 'New Crop Registered',
  //     message: `${crop.cropName} has been registered. Initial setup tasks have been added.`,
  //     type: 'info',
  //     category: 'crop',
  //     priority: 'medium',
  //     relatedEntityId: crop.userId.toString()
  //   });
  // }

  // private async notifyHealthIssue(crop: ICropData, issue: any): Promise<void> {
  //   await notificationService.createNotification({
  //     userId: crop.userId.toString(),
  //     title: `Health Issue Detected: ${crop.cropName}`,
  //     message: `${issue.name} detected with ${issue.severity} severity. Immediate attention recommended.`,
  //     type: 'alert',
  //     category: 'health',
  //     priority: 'high',
  //     relatedEntityId: crop.userId.toString()
  //   });
  // }
}

export const cropService = new CropService();
export default cropService;
