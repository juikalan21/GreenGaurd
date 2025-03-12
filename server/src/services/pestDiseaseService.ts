import mongoose from 'mongoose';
import { 
  PestDiseaseDetection, 
  IPestDiseaseDetection, 
  DetectionType, 
  Severity, 
  TreatmentType,
  DetectionStatus 
} from '../models/PestDiseaseDetection';
import { CropData, ICropData } from '../models/CropData';
import { User } from '../models/User';
import { aiService } from './aiService';
import logger from '../config/logger';

/**
 * Service for handling pest and disease detection and management
 */
export const pestDiseaseService = {
  /**
   * Detect pests or diseases using AI image analysis
   */
  async detectWithAI(
    userId: string,
    farmId: string,
    cropId: string,
    imageUrl: string,
    location: { latitude: number; longitude: number }
  ): Promise<IPestDiseaseDetection> {
    try {
      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify crop exists and belongs to user
      const crop = await CropData.findOne({
        _id: cropId,
        userId: new mongoose.Types.ObjectId(userId),
        farmId
      });
      
      if (!crop) {
        throw new Error('Crop not found or does not belong to user');
      }

      logger.info(`Analyzing crop image for pest/disease detection: ${cropId}`);

      // Get crop and farm context for AI analysis
      const farmDetails = user.farms.find(farm => farm._id.toString() === farmId);
      if (!farmDetails) {
        throw new Error('Farm details not found');
      }

      const analysisContext = {
        farmLocation: {
          state: user.location.state || 'Unknown',
          district: user.location.district || 'Unknown'
        },
        cropName: crop.cropName,
        cropType: crop.cropType,
        growthStage: crop.growthStage,
        plantingDate: crop.plantingDate.toISOString().split('T')[0]
      };

      // Analyze image using AI
      const aiResult = await aiService.analyzeImageWithAI(
        imageUrl, 
        'pest_disease', 
        analysisContext
      );
      
      if (!aiResult || aiResult.rawResponse) {
        throw new Error('AI analysis failed');
      }

      // Determine detection type based on AI result
      let detectionType = DetectionType.PEST;
      if (aiResult.identification && aiResult.identification.type) {
        if (aiResult.identification.type.toLowerCase().includes('disease')) {
          detectionType = DetectionType.DISEASE;
        } else if (aiResult.identification.type.toLowerCase().includes('nutrient')) {
          detectionType = DetectionType.NUTRIENT_DEFICIENCY;
        } else if (aiResult.identification.type.toLowerCase().includes('weed')) {
          detectionType = DetectionType.WEED;
        }
      }

      // Determine severity
      let severity = Severity.MEDIUM;
      if (aiResult.severity) {
        if (aiResult.severity.toLowerCase() === 'low') {
          severity = Severity.LOW;
        } else if (aiResult.severity.toLowerCase() === 'high') {
          severity = Severity.HIGH;
        } else if (aiResult.severity.toLowerCase() === 'critical') {
          severity = Severity.CRITICAL;
        }
      }

      // Create detection record
      const detection = await PestDiseaseDetection.create({
        userId: new mongoose.Types.ObjectId(userId),
        farmId,
        cropId: new mongoose.Types.ObjectId(cropId),
        location: {
          coordinates: [location.longitude, location.latitude]
        },
        images: [{ original: imageUrl }],
        detectionType,
        detectionResult: {
          name: aiResult.identification?.name || 'Unknown',
          confidence: aiResult.confidenceLevel ? parseFloat(aiResult.confidenceLevel) : 70,
          severity,
          affectedArea: aiResult.affectedArea ? parseFloat(aiResult.affectedArea) : 5,
          identifiedAt: new Date()
        },
        symptoms: {
          observed: aiResult.symptoms || [],
          severity
        },
        recommendations: {
          treatments: (aiResult.treatments || []).map((treatment: any) => ({
            name: treatment.name,
            type: this.mapTreatmentType(treatment.type),
            dosage: treatment.dosage,
            frequency: treatment.frequency
          })),
          preventive: aiResult.preventiveMeasures || []
        },
        status: {
          current: DetectionStatus.DETECTED,
          history: [{
            status: DetectionStatus.DETECTED,
            date: new Date()
          }]
        },
        notes: aiResult.analysis || ''
      });

      // Update crop health status with this issue
      await this.updateCropHealthWithDetection(crop, detection);

    //   // Create notification for the farmer
    //   await notificationService.createNotification({
    //     userId,
    //     title: `${this.capitalizeFirstLetter(detectionType)} Detected: ${detection.detectionResult.name}`,
    //     message: `A ${severity.toLowerCase()} severity ${detectionType.toLowerCase().replace('_', ' ')} has been detected in your ${crop.cropName}. Check the app for treatment options.`,
    //     type: 'alert',
    //     category: 'pest_disease',
    //     priority: this.getNotificationPriority(severity),
    //     actionRequired: true,
    //     relatedEntityType: 'pest_disease',
    //     relatedEntityId: detection._id.toString(),
    //   });

      logger.info(`Pest/Disease detection created: ${detection._id}`);
      return detection;
    } catch (error) {
      logger.error(`Pest/Disease detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Add manual pest or disease detection
   */
  async addManualDetection(
    userId: string,
    farmId: string,
    cropId: string,
    detectionData: {
      imageUrls: string[];
      detectionType: DetectionType;
      name: string;
      severity: Severity;
      affectedArea: number;
      symptoms: string[];
      location?: { latitude: number; longitude: number };
    }
  ): Promise<IPestDiseaseDetection> {
    try {
      // Verify crop exists and belongs to user
      const crop = await CropData.findOne({
        _id: cropId,
        userId: new mongoose.Types.ObjectId(userId),
        farmId
      });
      
      if (!crop) {
        throw new Error('Crop not found or does not belong to user');
      }

      const location = detectionData.location || {
        latitude: 0,
        longitude: 0
      };

      // Create detection record
      const detection = await PestDiseaseDetection.create({
        userId: new mongoose.Types.ObjectId(userId),
        farmId,
        cropId: new mongoose.Types.ObjectId(cropId),
        location: {
          coordinates: [location.longitude, location.latitude]
        },
        images: detectionData.imageUrls.map(url => ({ original: url })),
        detectionType: detectionData.detectionType,
        detectionResult: {
          name: detectionData.name,
          confidence: 100, // Manual detection has 100% confidence
          severity: detectionData.severity,
          affectedArea: detectionData.affectedArea,
          identifiedAt: new Date()
        },
        symptoms: {
          observed: detectionData.symptoms,
          severity: detectionData.severity
        },
        status: {
          current: DetectionStatus.DETECTED,
          history: [{
            status: DetectionStatus.DETECTED,
            date: new Date()
          }]
        }
      });

      // Update crop health status with this issue
      await this.updateCropHealthWithDetection(crop, detection);

    //   // Create notification for the farmer
    //   await notificationService.createNotification({
    //     userId,
    //     title: `${this.capitalizeFirstLetter(detectionData.detectionType)} Recorded: ${detectionData.name}`,
    //     message: `A ${detectionData.severity.toLowerCase()} severity ${detectionData.detectionType.toLowerCase().replace('_', ' ')} has been recorded in your ${crop.cropName}.`,
    //     type: 'alert',
    //     category: 'pest_disease',
    //     priority: this.getNotificationPriority(detectionData.severity),
    //     actionRequired: true,
    //     relatedEntityType: 'pest_disease',
    //     relatedEntityId: detection._id.toString(),
    //   });

      logger.info(`Manual pest/disease detection created: ${detection._id}`);
      return detection;
    } catch (error) {
      logger.error(`Manual pest/disease detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Get detection by ID
   */
  async getDetection(
    detectionId: string,
    userId: string
  ): Promise<IPestDiseaseDetection> {
    try {
      const detection = await PestDiseaseDetection.findById(detectionId);
      if (!detection) {
        throw new Error('Pest/Disease detection not found');
      }

      // Check if user owns this detection
      if (!detection.userId.equals(new mongoose.Types.ObjectId(userId))) {
        throw new Error('Not authorized to access this detection');
      }

      return detection;
    } catch (error) {
      logger.error(`Get detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Get all detections for a farm
   */
  async getFarmDetections(
    userId: string,
    farmId: string,
    filters: {
      status?: DetectionStatus;
      detectionType?: DetectionType;
      severity?: Severity;
      resolved?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{
    detections: IPestDiseaseDetection[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const query: any = {
        userId: new mongoose.Types.ObjectId(userId),
        farmId
      };

      // Apply filters
      if (filters.status) {
        query['status.current'] = filters.status;
      }

      if (filters.detectionType) {
        query.detectionType = filters.detectionType;
      }

      if (filters.severity) {
        query['detectionResult.severity'] = filters.severity;
      }

      if (filters.resolved !== undefined) {
        query.resolved = filters.resolved;
      }

      if (filters.startDate || filters.endDate) {
        query['detectionResult.identifiedAt'] = {};
        
        if (filters.startDate) {
          query['detectionResult.identifiedAt'].$gte = filters.startDate;
        }
        
        if (filters.endDate) {
          query['detectionResult.identifiedAt'].$lte = filters.endDate;
        }
      }

      const detections = await PestDiseaseDetection.find(query)
        .sort({ 'detectionResult.identifiedAt': -1 })
        .skip(skip)
        .limit(limit);

      const total = await PestDiseaseDetection.countDocuments(query);

      return {
        detections,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error(`Get farm detections error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Get all detections for a specific crop
   */
  async getCropDetections(
    userId: string,
    cropId: string,
    filters: {
      status?: DetectionStatus;
      detectionType?: DetectionType;
      severity?: Severity;
      resolved?: boolean;
    } = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{
    detections: IPestDiseaseDetection[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const query: any = {
        userId: new mongoose.Types.ObjectId(userId),
        cropId: new mongoose.Types.ObjectId(cropId)
      };

      // Apply filters
      if (filters.status) {
        query['status.current'] = filters.status;
      }

      if (filters.detectionType) {
        query.detectionType = filters.detectionType;
      }

      if (filters.severity) {
        query['detectionResult.severity'] = filters.severity;
      }

      if (filters.resolved !== undefined) {
        query.resolved = filters.resolved;
      }

      const detections = await PestDiseaseDetection.find(query)
        .sort({ 'detectionResult.identifiedAt': -1 })
        .skip(skip)
        .limit(limit);

      const total = await PestDiseaseDetection.countDocuments(query);

      return {
        detections,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error(`Get crop detections error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Update detection with treatment applied
   */
  async recordTreatment(
    detectionId: string,
    userId: string,
    treatmentData: {
      name: string;
      type: TreatmentType;
      dosage: string;
      frequency: string;
      applicationDate: Date;
      applicator: string;
      notes?: string;
    }
  ): Promise<IPestDiseaseDetection> {
    try {
      const detection = await PestDiseaseDetection.findById(detectionId);
      if (!detection) {
        throw new Error('Pest/Disease detection not found');
      }

      // Check if user owns this detection
      if (!detection.userId.equals(new mongoose.Types.ObjectId(userId))) {
        throw new Error('Not authorized to update this detection');
      }

      // Add treatment if it doesn't exist yet
      if (!detection.recommendations) {
        detection.recommendations = { treatments: [], preventive: [] };
      }

      if (!detection.recommendations.treatments) {
        detection.recommendations.treatments = [];
      }

      detection.recommendations.treatments.push({
        name: treatmentData.name,
        type: treatmentData.type,
        dosage: treatmentData.dosage,
        frequency: treatmentData.frequency
      });

      // Update status
      detection.status.current = DetectionStatus.IN_TREATMENT;
      detection.status.history.push({
        status: DetectionStatus.IN_TREATMENT,
        date: treatmentData.applicationDate
      });

      // Add notes
      if (treatmentData.notes) {
        detection.notes = detection.notes 
          ? `${detection.notes}\n\nTreatment applied on ${treatmentData.applicationDate.toISOString().split('T')[0]}: ${treatmentData.notes}`
          : `Treatment applied on ${treatmentData.applicationDate.toISOString().split('T')[0]}: ${treatmentData.notes}`;
      }

      await detection.save();

    //   // Create notification for treatment record
    //   await notificationService.createNotification({
    //     userId,
    //     title: `Treatment Applied: ${treatmentData.name}`,
    //     message: `Treatment has been applied for ${detection.detectionResult.name} in your crop. Continue monitoring the situation.`,
    //     type: 'info',
    //     category: 'pest_disease',
    //     priority: 'medium',
    //     actionRequired: false,
    //     relatedEntityType: 'pest_disease',
    //     relatedEntityId: detection._id.toString(),
    //   });

      logger.info(`Treatment recorded for detection: ${detection._id}`);
      return detection;
    } catch (error) {
      logger.error(`Record treatment error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Mark detection as resolved
   */
  async resolveDetection(
    detectionId: string,
    userId: string,
    resolutionData: {
      resolutionMethod: string;
      resolutionDate?: Date;
      notes?: string;
      effectiveness?: 'low' | 'medium' | 'high' | 'complete';
    }
  ): Promise<IPestDiseaseDetection> {
    try {
      const detection = await PestDiseaseDetection.findById(detectionId);
      if (!detection) {
        throw new Error('Pest/Disease detection not found');
      }

      // Check if user owns this detection
      if (!detection.userId.equals(new mongoose.Types.ObjectId(userId))) {
        throw new Error('Not authorized to update this detection');
      }

      // Update status
      detection.resolved = true;
      detection.resolvedAt = resolutionData.resolutionDate || new Date();
      detection.status.current = DetectionStatus.RESOLVED;
      detection.status.history.push({
        status: DetectionStatus.RESOLVED,
        date: detection.resolvedAt
      });

      // Add notes
      const resolutionNote = `Resolution on ${detection.resolvedAt.toISOString().split('T')[0]}: ${resolutionData.resolutionMethod}${resolutionData.effectiveness ? ` (Effectiveness: ${resolutionData.effectiveness})` : ''}${resolutionData.notes ? `\n${resolutionData.notes}` : ''}`;
      
      detection.notes = detection.notes 
        ? `${detection.notes}\n\n${resolutionNote}`
        : resolutionNote;

      await detection.save();

      // Update crop health status
      await this.updateCropHealthAfterResolution(detection);

      // Create notification for resolution
    //   await notificationService.createNotification({
    //     userId,
    //     title: `${this.capitalizeFirstLetter(detection.detectionType)} Resolved`,
    //     message: `The ${detection.detectionResult.name} issue in your crop has been successfully resolved.`,
    //     type: 'success',
    //     category: 'pest_disease',
    //     priority: 'medium',
    //     actionRequired: false,
    //     relatedEntityType: 'pest_disease',
    //     relatedEntityId: detection._id.toString(),
    //   });

      logger.info(`Detection marked as resolved: ${detection._id}`);
      return detection;
    } catch (error) {
      logger.error(`Resolve detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Generate treatment plan for a detection
   */
  async generateTreatmentPlan(
    detectionId: string,
    userId: string
  ): Promise<{
    treatmentPlan: {
      immediate: Array<{
        action: string;
        priority: 'high' | 'medium' | 'low';
        timeline: string;
      }>;
      preventive: Array<{
        action: string;
        purpose: string;
      }>;
      followUp: Array<{
        action: string;
        timeline: string;
      }>;
    };
    analysis: string;
  }> {
    try {
      const detection = await PestDiseaseDetection.findById(detectionId);
      if (!detection) {
        throw new Error('Pest/Disease detection not found');
      }

      // Check if user owns this detection
      if (!detection.userId.equals(new mongoose.Types.ObjectId(userId))) {
        throw new Error('Not authorized to access this detection');
      }

      // Get associated crop info
      const crop = await CropData.findById(detection.cropId);
      if (!crop) {
        throw new Error('Crop not found');
      }

      // Build context for AI analysis
      const treatmentContext = {
        detection: {
          type: detection.detectionType,
          name: detection.detectionResult.name,
          severity: detection.detectionResult.severity,
          affectedArea: detection.detectionResult.affectedArea,
          symptoms: detection.symptoms.observed
        },
        crop: {
          name: crop.cropName,
          type: crop.cropType,
          growthStage: crop.growthStage,
          plantingDate: crop.plantingDate.toISOString().split('T')[0],
          expectedHarvestDate: crop.expectedHarvestDate ? crop.expectedHarvestDate.toISOString().split('T')[0] : 'unknown'
        },
        existingTreatments: detection.recommendations?.treatments || []
      };

      // Generate AI treatment plan
      const prompt = `
        Generate a detailed treatment plan for the following agricultural issue:
        
        Issue Details:
        ${JSON.stringify(treatmentContext, null, 2)}
        
        Please provide:
        1. Immediate actions needed with priority levels and timeline
        2. Preventive measures for avoiding recurrence
        3. Follow-up actions and monitoring procedures
        4. A detailed analysis of the treatment approach
        
        Format the response as a structured JSON object with immediate, preventive, and followUp action arrays,
        plus an analysis field.
      `;

      // Using the general content generation to create a treatment plan
      // const response = await aiService.generateContent(prompt); //Original Code
      const aiResult = await aiService.analyzeImageWithAI(
        '', // Image URL not needed for treatment plan generation
        'pest_disease', // Reuse pest_disease analysis type
        { prompt: prompt } // Pass the prompt as context
      );
      const response = aiResult.analysis;
      // Parse and prepare response
      try {
        const treatmentPlan = JSON.parse(response);
        
        // Store the treatment plan in the detection record
        detection.notes = detection.notes
          ? `${detection.notes}\n\nAI TREATMENT PLAN GENERATED:\n${response}`
          : `AI TREATMENT PLAN GENERATED:\n${response}`;
        
        await detection.save();
        
        return treatmentPlan;
      } catch (parseError) {
        // If not valid JSON, return formatted response
        logger.warn(`AI treatment plan response was not valid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        
        // Store the raw treatment plan in the detection record
        detection.notes = detection.notes
          ? `${detection.notes}\n\nAI TREATMENT PLAN GENERATED:\n${response}`
          : `AI TREATMENT PLAN GENERATED:\n${response}`;
        
        await detection.save();
        
        return {
          treatmentPlan: {
            immediate: [{
              action: "Review AI analysis and create custom treatment plan",
              priority: "high",
              timeline: "Immediate"
            }],
            preventive: [],
            followUp: []
          },
          analysis: response
        };
      }
    } catch (error) {
      logger.error(`Generate treatment plan error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Get detection statistics for a farm
   */
    /**
   * Get detection statistics for a farm
   */
    async getFarmDetectionStatistics(
        userId: string,
        farmId: string,
        startDate?: Date,
        endDate?: Date
      ): Promise<{
        totalDetections: number;
        resolved: number;
        unresolved: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
        byStatus: Record<string, number>;
        treatmentEffectiveness?: number;
        recentTrends?: {
          increasing: string[];
          decreasing: string[];
        };
      }> {
        try {
          const query: any = {
            userId: new mongoose.Types.ObjectId(userId),
            farmId
          };
    
          // Apply date filters if provided
          if (startDate || endDate) {
            query['detectionResult.identifiedAt'] = {};
            
            if (startDate) {
              query['detectionResult.identifiedAt'].$gte = startDate;
            }
            
            if (endDate) {
              query['detectionResult.identifiedAt'].$lte = endDate;
            }
          }
    
          const detections = await PestDiseaseDetection.find(query);
    
          // Calculate statistics
          const stats = {
            totalDetections: detections.length,
            resolved: detections.filter(d => d.resolved).length,
            unresolved: detections.filter(d => !d.resolved).length,
            byType: {} as Record<string, number>,
            bySeverity: {} as Record<string, number>,
            byStatus: {} as Record<string, number>,
            treatmentEffectiveness: 0,
            recentTrends: undefined, // Initialize recentTrends to undefined
          };
    
          // Count by type
          detections.forEach(detection => {
            // By detection type
            const type = detection.detectionType;
            stats.byType[type] = stats.byType[type] ? stats.byType[type] + 1 : 1;
    
            // By severity
            const severity = detection.detectionResult.severity;
            stats.bySeverity[severity] = stats.bySeverity[severity] ? stats.bySeverity[severity] + 1 : 1;
    
            // By status
            const status = detection.status.current;
            stats.byStatus[status] = stats.byStatus[status] ? stats.byStatus[status] + 1 : 1;
          });
    
          // Calculate treatment effectiveness (simple formula: resolved / total)
          if (stats.totalDetections > 0) {
            stats.treatmentEffectiveness = (stats.resolved / stats.totalDetections) * 100;
          }
    
          // Calculate trends (simple - comparing first half to second half of time period)
          if (detections.length > 1) {
            const sorted = [...detections].sort((a, b) => 
              a.detectionResult.identifiedAt.getTime() - b.detectionResult.identifiedAt.getTime()
            );
            
            const midpoint = Math.floor(sorted.length / 2);
            const firstHalf = sorted.slice(0, midpoint);
            const secondHalf = sorted.slice(midpoint);
    
            const firstHalfTypes: Record<string, number> = {};
            const secondHalfTypes: Record<string, number> = {};
    
            // Count issues by type in each half
            firstHalf.forEach(detection => {
              const type = detection.detectionResult.name;
              firstHalfTypes[type] = firstHalfTypes[type] ? firstHalfTypes[type] + 1 : 1;
            });
    
            secondHalf.forEach(detection => {
              const type = detection.detectionResult.name;
              secondHalfTypes[type] = secondHalfTypes[type] ? secondHalfTypes[type] + 1 : 1;
            });
    
            // Identify increasing and decreasing trends
            const increasing: string[] = [];
            const decreasing: string[] = [];
    
            // Check all types that appear in either half
            const allTypes = new Set([...Object.keys(firstHalfTypes), ...Object.keys(secondHalfTypes)]);
            
            allTypes.forEach(type => {
              const firstCount = firstHalfTypes[type] || 0;
              const secondCount = secondHalfTypes[type] || 0;
              
              if (secondCount > firstCount) {
                increasing.push(type);
              } else if (firstCount > secondCount) {
                decreasing.push(type);
              }
            });
    
           // stats.recentTrends = { increasing, decreasing };
          }
    
          return stats;
        } catch (error) {
          logger.error(`Get farm detection statistics error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      },

  /**
   * Helper method to update crop health status based on detection
   */
  async updateCropHealthWithDetection(
    crop: ICropData,
    detection: IPestDiseaseDetection
  ): Promise<void> {
    try {
      // Create a new health issue in the crop data
      if (!crop.healthStatus.issues) {
        crop.healthStatus.issues = [];
      }

      // Map detection type to crop health issue type
      let issueType: 'pest' | 'disease' | 'nutrient' | 'water' | 'other' = 'other';
      switch (detection.detectionType) {
        case DetectionType.PEST:
          issueType = 'pest';
          break;
        case DetectionType.DISEASE:
          issueType = 'disease';
          break;
        case DetectionType.NUTRIENT_DEFICIENCY:
          issueType = 'nutrient';
          break;
        default:
          issueType = 'other';
      }

      // Map severity
      let issueSeverity: 'low' | 'medium' | 'high';
      switch (detection.detectionResult.severity) {
        case Severity.LOW:
          issueSeverity = 'low';
          break;
        case Severity.MEDIUM:
          issueSeverity = 'medium';
          break;
        case Severity.HIGH:
        case Severity.CRITICAL:
          issueSeverity = 'high';
          break;
        default:
          issueSeverity = 'medium';
      }

      // Add the issue to the crop
      crop.healthStatus.issues.push({
        type: issueType,
        name: detection.detectionResult.name,
        severity: issueSeverity,
        detectedAt: detection.detectionResult.identifiedAt,
        resolved: false
      });

      // Update overall health status based on most severe issue
      if (detection.detectionResult.severity === Severity.CRITICAL) {
        crop.healthStatus.overall = 'critical';
      } else if (detection.detectionResult.severity === Severity.HIGH && crop.healthStatus.overall !== 'critical') {
        crop.healthStatus.overall = 'poor';
      } else if (detection.detectionResult.severity === Severity.MEDIUM && 
                ['excellent', 'good'].includes(crop.healthStatus.overall)) {
        crop.healthStatus.overall = 'fair';
      }

      await crop.save();
      logger.info(`Updated crop health status for crop: ${crop._id}`);
    } catch (error) {
      logger.error(`Update crop health status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * Helper method to update crop health status after issue resolution
   */
  async updateCropHealthAfterResolution(
    detection: IPestDiseaseDetection
  ): Promise<void> {
    try {
      const crop = await CropData.findById(detection.cropId);
      if (!crop) {
        logger.warn(`Could not find crop ${detection.cropId} to update health status after resolution`);
        return;
      }

      // Find and update the matching issue in crop health status
      const matchingIssueIndex = crop.healthStatus.issues.findIndex(issue => 
        issue.name === detection.detectionResult.name && 
        !issue.resolved
      );

      if (matchingIssueIndex !== -1) {
        crop.healthStatus.issues[matchingIssueIndex].resolved = true;
        logger.info(`Marked crop health issue as resolved for crop: ${crop._id}`);
      }

      // Recalculate overall health status
      const activeIssues = crop.healthStatus.issues.filter(issue => !issue.resolved);
      
      if (activeIssues.length === 0) {
        crop.healthStatus.overall = 'good';
      } else {
        // Set overall health based on most severe active issue
        const hasCritical = activeIssues.some(issue => issue.severity === 'high' && 
          (issue.type === 'disease' || issue.type === 'pest'));
        const hasHigh = activeIssues.some(issue => issue.severity === 'high');
        const hasMedium = activeIssues.some(issue => issue.severity === 'medium');
        
        if (hasCritical) {
          crop.healthStatus.overall = 'critical';
        } else if (hasHigh) {
          crop.healthStatus.overall = 'poor';
        } else if (hasMedium) {
          crop.healthStatus.overall = 'fair';
        } else {
          crop.healthStatus.overall = 'good';
        }
      }

      await crop.save();
    } catch (error) {
      logger.error(`Update crop health after resolution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't rethrow - this is a helper method that shouldn't break the main flow
    }
  },

  /**
   * Helper method to map treatment type string to enum
   */
  mapTreatmentType(type: string): TreatmentType {
    type = type.toLowerCase();
    if (type.includes('chemical')) return TreatmentType.CHEMICAL;
    if (type.includes('biological')) return TreatmentType.BIOLOGICAL;
    if (type.includes('cultural')) return TreatmentType.CULTURAL;
    if (type.includes('mechanical')) return TreatmentType.MECHANICAL;
    if (type.includes('integrated')) return TreatmentType.INTEGRATED;
    return TreatmentType.CHEMICAL;
  },

  /**
   * Helper method to get notification priority from severity
   */
  getNotificationPriority(severity: Severity): 'low' | 'medium' | 'high' | 'urgent' {
    switch (severity) {
      case Severity.LOW:
        return 'low';
      case Severity.MEDIUM:
        return 'medium';
      case Severity.HIGH:
        return 'high';
      case Severity.CRITICAL:
        return 'urgent';
      default:
        return 'medium';
    }
  },

  /**
   * Helper method to capitalize first letter
   */
  capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.replace('_', ' ').slice(1);
  }
};

export default pestDiseaseService;