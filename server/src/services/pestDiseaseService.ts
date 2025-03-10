import { PestDiseaseDetection, IPestDiseaseDetection } from '../models/PestDiseaseDetection';
import { User } from '../models/User';
import { CropData } from '../models/CropData';
import { processAndUploadImage } from '../utils/imageProcessor';
import { analyzeImageWithAI } from './aiService';
import { notificationService } from './notificationService';

interface TreatmentInput {
  name: string;
  type: 'chemical' | 'biological' | 'cultural' | 'mechanical';
  application: string;
  dosage: string;
  precautions: string[];
  effectiveness: number;
  organicStatus: boolean;
}

export const pestDiseaseService = {
  async createDetection(
    userId: string,
    farmId: string,
    cropDataId: string,
    notes?: string
  ): Promise<IPestDiseaseDetection> {
    const [user, cropData] = await Promise.all([
      User.findById(userId),
      CropData.findOne({ _id: cropDataId, userId })
    ]);

    if (!user) throw new Error('User not found');
    if (!cropData) throw new Error('Crop data not found');

    const farm = user.farmDetails.find(farm => farm._id?.toString() === farmId);
    if (!farm) throw new Error('Farm not found');

    return PestDiseaseDetection.create({
      userId,
      farmId,
      cropDataId,
      notes,
      detectionType: 'other',
      detectionResult: {
        name: 'Unknown',
        confidence: 0,
        severity: 'low',
        affectedArea: 0,
        identifiedAt: new Date()
      },
      symptoms: [],
      recommendations: {
        immediate: [],
        preventive: [],
        treatments: []
      }
    });
  },

  async processImage(
    detectionId: string,
    file: Express.Multer.File
  ): Promise<IPestDiseaseDetection> {
    const detection = await PestDiseaseDetection.findById(detectionId);
    if (!detection) throw new Error('Detection not found');

    const imageUrl = await processAndUploadImage(file, `pest-disease/${detection.userId}`);
    detection.imageUrl = imageUrl;
    await detection.save();

    return this.analyzeWithAI(detectionId);
  },

  async analyzeWithAI(detectionId: string): Promise<IPestDiseaseDetection> {
    const detection = await PestDiseaseDetection.findById(detectionId);
    if (!detection) throw new Error('Detection not found');
    if (!detection.imageUrl) throw new Error('No image found');

    const [cropData, user] = await Promise.all([
      CropData.findById(detection.cropDataId),
      User.findById(detection.userId)
    ]);
    if (!cropData || !user) throw new Error('Required data not found');

    const aiResult = await analyzeImageWithAI(detection.imageUrl, 'pest_disease', {
      farmLocation: user.location,
      cropName: cropData.cropName,
      cropType: cropData.cropType,
      growthStage: cropData.growthStage
    });

    Object.assign(detection, {
      detectionType: aiResult.type,
      detectionResult: {
        name: aiResult.name,
        confidence: aiResult.confidenceLevel,
        severity: this.mapSeverity(aiResult.severityLevel),
        affectedArea: aiResult.affectedAreaPercentage,
        identifiedAt: new Date()
      },
      symptoms: aiResult.symptoms || [],
      recommendations: {
        immediate: aiResult.immediateActionRecommendations || [],
        preventive: aiResult.preventiveMeasures || [],
        treatments: this.mapTreatmentOptions(aiResult.treatmentOptions)
      }
    });

    await detection.save();

    if (aiResult.confidenceLevel > 70) {
      await this.updateCropHealth(detection, cropData);
      await this.notifyUser(detection);
    }

    return detection;
  },

  async getDetections(query: { userId: string; cropDataId?: string }, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [detections, total] = await Promise.all([
      PestDiseaseDetection.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PestDiseaseDetection.countDocuments(query)
    ]);

    return { detections, total, page, limit };
  },

  async addTreatment(
    detectionId: string,
    userId: string,
    treatment: TreatmentInput
  ): Promise<IPestDiseaseDetection> {
    const detection = await PestDiseaseDetection.findById(detectionId);
    if (!detection) throw new Error('Detection not found');
    if (detection.userId.toString() !== userId) throw new Error('Not authorized');

    detection.recommendations.treatments.push(treatment);
    await detection.save();
    return detection;
  },

  async resolveDetection(
    detectionId: string,
    userId: string,
    resolutionMethod?: string
  ): Promise<IPestDiseaseDetection> {
    const detection = await PestDiseaseDetection.findById(detectionId);
    if (!detection) throw new Error('Detection not found');
    if (detection.userId.toString() !== userId) throw new Error('Not authorized');

    detection.resolved = true;
    detection.resolvedAt = new Date();
    detection.resolutionMethod = resolutionMethod || '';
    await detection.save();

    const cropData = await CropData.findById(detection.cropDataId);
    if (cropData) {
      const issue = cropData.healthStatus.issues.find(
        issue => issue.type === detection.detectionType && 
                 issue.name === detection.detectionResult.name &&
                 !issue.resolved
      );
      if (issue) {
        issue.resolved = true;
        issue.resolvedAt = new Date();
        issue.treatmentApplied = resolutionMethod || 'Issue resolved';
        await cropData.save();
      }
    }

    return detection;
  },

  private async updateCropHealth(detection: IPestDiseaseDetection, cropData: any) {
    cropData.healthStatus.issues.push({
      type: detection.detectionType,
      name: detection.detectionResult.name,
      severity: detection.detectionResult.severity,
      detectedAt: new Date(),
      resolved: false,
      imageUrl: detection.imageUrl
    });
    await cropData.save();
  },

  private async notifyUser(detection: IPestDiseaseDetection) {
    await notificationService.createNotification({
      userId: detection.userId.toString(),
      title: `${this.capitalizeFirst(detection.detectionType)} Detected: ${detection.detectionResult.name}`,
      message: `${this.capitalizeFirst(detection.detectionResult.severity)} severity issue detected.`,
      type: 'warning',
      priority: 'high',
      actionRequired: true,
      relatedEntityType: 'pest_disease',
      relatedEntityId: detection._id.toString()
    });
  },

  private mapSeverity(severity: string): 'low' | 'medium' | 'high' {
    const severityMap: Record<string, 'low' | 'medium' | 'high'> = {
      low: 'low',
      medium: 'medium',
      high: 'high'
    };
    return severityMap[severity?.toLowerCase()] || 'low';
  },

  private mapTreatmentOptions(options: any) {
    const treatments: TreatmentInput[] = [];
    const types = ['chemical', 'biological', 'cultural', 'mechanical'];
    
    types.forEach(type => {
      if (options?.[type]) {
        options[type].forEach((name: string) => {
          treatments.push({
            name,
            type: type as TreatmentInput['type'],
            application: type === 'chemical' ? 'As directed by manufacturer' : 'As needed',
            dosage: type === 'chemical' ? 'As recommended' : 'N/A',
            precautions: type === 'chemical' ? ['Wear protective equipment'] : [],
            effectiveness: type === 'chemical' ? 80 : 60,
            organicStatus: type !== 'chemical'
          });
        });
      }
    });
    
    return treatments;
  },

  private capitalizeFirst(str: string): string {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }
};

export default pestDiseaseService;
