// import { 
//   PestDiseaseDetection, 
//   IPestDiseaseDetection, 
//   DetectionType, 
//   Severity, 
//   TreatmentType 
// } from '../models/PestDiseaseDetection';
// import { User } from '../models/User';
// import { CropData } from '../models/CropData';
// //import { notificationService } from './notificationService';
// import mongoose from 'mongoose';
// import { DetectionStatus } from '../models/PestDiseaseDetection';

// /**
//  * Interface for treatment input data
//  */
// interface TreatmentInput {
//   name: string;
//   type: TreatmentType;
//   dosage: string;
//   frequency: string;
// }

// /**
//  * Service for handling pest and disease detection
//  */
// export const pestDiseaseService = {
//   /**
//    * Create a new pest/disease detection record
//    */
//   async createDetection(
//     userId: string,
//     farmId: string,
//     cropId: string,
//     location: { coordinates: number[] },
//     detectionType: DetectionType = DetectionType.OTHER,
//     notes?: string
//   ): Promise<IPestDiseaseDetection> {
//     try {
//       // Validate user and crop exist
//       const [user, crop] = await Promise.all([
//         User.findById(userId),
//         CropData.findOne({ _id: cropId, userId })
//       ]);

//       if (!user) throw new Error('User not found');
//       if (!crop) throw new Error('Crop not found');

//       // Create initial detection record
//       const detection = await PestDiseaseDetection.create({
//         userId: new mongoose.Types.ObjectId(userId),
//         farmId,
//         cropId: new mongoose.Types.ObjectId(cropId),
//         location,
//         images: [],
//         detectionType,
//         detectionResult: {
//           name: 'Unknown',
//           confidence: 0,
//           severity: Severity.LOW,
//           affectedArea: 0,
//           identifiedAt: new Date()
//         },
//         symptoms: {
//           observed: [],
//           severity: Severity.LOW
//         },
//         recommendations: {
//           treatments: [],
//           preventive: []
//         },
//         status: {
//           current: 'detected',
//           history: [{
//             status: 'detected',
//             date: new Date()
//           }]
//         },
//         resolved: false,
//         notes
//       });

//       return detection;
//     } catch (error) {
//       console.error(`Create detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       throw error;
//     }
//   },

//   /**
//    * Add images to detection record
//    */
//   async addImage(
//     detectionId: string,
//     userId: string,
//     imageUrl: string,
//     processedImageUrl?: string
//   ): Promise<IPestDiseaseDetection> {
//     try {
//       const detection = await this.validateUserDetection(detectionId, userId);
      
//       detection.images.push({
//         original: imageUrl,
//         processed: processedImageUrl
//       });
      
//       await detection.save();
//       return detection;
//     } catch (error) {
//       console.error(`Add image error: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       throw error;
//     }
//   },

//   /**
//    * Update detection details
//    */
//   async updateDetectionDetails(
//     detectionId: string,
//     userId: string,
//     updateData: {
//       detectionType?: DetectionType;
//       name?: string;
//       confidence?: number;
//       severity?: Severity;
//       affectedArea?: number;
//       symptoms?: string[];
//       symptomSeverity?: Severity;
//     }
//   ): Promise<IPestDiseaseDetection> {
//     try {
//       const detection = await this.validateUserDetection(detectionId, userId);
      
//       // Update detection properties if provided
//       if (updateData.detectionType) {
//         detection.detectionType = updateData.detectionType;
//       }
      
//       // Update detection result
//       if (updateData.name || updateData.confidence || updateData.severity || updateData.affectedArea) {
//         detection.detectionResult = {
//           name: updateData.name || detection.detectionResult.name,
//           confidence: updateData.confidence !== undefined ? updateData.confidence : detection.detectionResult.confidence,
//           severity: updateData.severity || detection.detectionResult.severity,
//           affectedArea: updateData.affectedArea !== undefined ? updateData.affectedArea : detection.detectionResult.affectedArea,
//           identifiedAt: new Date()
//         };
//       }
      
//       // Update symptoms if provided
//       if (updateData.symptoms || updateData.symptomSeverity) {
//         detection.symptoms = {
//           observed: updateData.symptoms || detection.symptoms.observed,
//           severity: updateData.symptomSeverity || detection.symptoms.severity
//         };
//       }
      
//       await detection.save();
      
//       // Send a notification if severity is medium or higher
//       // if (updateData.severity && (updateData.severity === Severity.HIGH || updateData.severity === Severity.CRITICAL)) {
//       //   await this.notifyUser(detection);
//       // }
      
//       return detection;
//     } catch (error) {
//       console.error(`Update detection details error: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       throw error;
//     }
//   },

//   /**
//    * Add treatment recommendation
//    */
//   async addTreatment(
//     detectionId: string,
//     userId: string,
//     treatment: TreatmentInput
//   ): Promise<IPestDiseaseDetection> {
//     try {
//       const detection = await this.validateUserDetection(detectionId, userId);
      
//       //detection.status.current = 'in_treatment';
//       detection.status.current = DetectionStatus.IN_TREATMENT;
//       detection.status.history.push({
//         status: 'in_treatment',
//         date: new Date()
//       });
      
//       await detection.save();
//       return detection;
//     } catch (error) {
//       console.error(`Add treatment error: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       throw error;
//     }
//   },

//   /**
//    * Add preventive recommendation
//    */
//   async addPreventive(
//     detectionId: string,
//     userId: string,
//     preventive: string
//   ): Promise<IPestDiseaseDetection> {
//     try {
//       const detection = await this.validateUserDetection(detectionId, userId);
      
//       detection.recommendations.preventive.push(preventive);
//       await detection.save();
      
//       return detection;
//     } catch (error) {
//       console.error(`Add preventive error: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       throw error;
//     }
//   },

//   /**
//    * Mark detection as resolved
//    */
//   async resolveDetection(
//     detectionId: string,
//     userId: string,
//     resolutionMethod?: string
//   ): Promise<IPestDiseaseDetection> {
//     try {
//       const detection = await this.validateUserDetection(detectionId, userId);
      
//       detection.resolved = true;
//       detection.resolvedAt = new Date();
//       detection.status.current = DetectionStatus.RESOLVED;
      
//       if (resolutionMethod) {
//         detection.notes = detection.notes 
//           ? `${detection.notes}\nResolution: ${resolutionMethod}`
//           : `Resolution: ${resolutionMethod}`;
//       }
      
//       detection.status.history.push({
//         status: 'resolved',
//         date: new Date()
//       });
      
//       await detection.save();
//       return detection;
//     } catch (error) {
//       console.error(`Resolve detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       throw error;
//     }
//   },

//   /**
//    * Get detection by ID
//    */
//   async getDetection(detectionId: string, userId: string): Promise<IPestDiseaseDetection> {
//     return this.validateUserDetection(detectionId, userId);
//   },

//   /**
//    * Get paginated detections with filters
//    */
//   async getDetections(query: { 
//     userId?: string; 
//     farmId?: string;
//     cropId?: string;
//     resolved?: boolean;
//     detectionType?: DetectionType;
//   }, page = 1, limit = 10) {
//     try {
//       const skip = (page - 1) * limit;
      
//       const [detections, total] = await Promise.all([
//         PestDiseaseDetection.find(query)
//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(limit),
//         PestDiseaseDetection.countDocuments(query)
//       ]);

//       return { detections, total, page, limit };
//     } catch (error) {
//       console.error(`Get detections error: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       throw error;
//     }
//   },

//   /**
//    * Get active cases for a farm
//    */
//   async getActiveCases(farmId: string): Promise<IPestDiseaseDetection[]> {
//     try {
//       return await PestDiseaseDetection.find({ farmId, resolved: false });
//     } catch (error) {
//       console.error(`Get active cases error: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       throw error;
//     }
//   },

//   /**
//    * Get farm detection summary
//    */
//   async getFarmDetectionSummary(userId: string, farmId: string): Promise<any> {
//     try {
//       const activeDetections = await PestDiseaseDetection.find({
//         userId: new mongoose.Types.ObjectId(userId),
//         farmId,
//         resolved: false
//       });
      
//       // Group by type and severity
//       const byType: Record<string, number> = {};
//       const bySeverity: Record<string, number> = {};
      
//       activeDetections.forEach(detection => {
//         // Count by type
//         byType[detection.detectionType] = (byType[detection.detectionType] || 0) + 1;
        
//         // Count by severity
//         bySeverity[detection.detectionResult.severity] = 
//           (bySeverity[detection.detectionResult.severity] || 0) + 1;
//       });
      
//       // Get highest risk detection if any
//       let highestRisk = null;
//       if (activeDetections.length > 0) {
//         const criticalDetections = activeDetections.filter(
//           d => d.detectionResult.severity === Severity.CRITICAL
//         );
        
//         const highDetections = activeDetections.filter(
//           d => d.detectionResult.severity === Severity.HIGH
//         );
        
//         highestRisk = criticalDetections.length > 0 ? 
//           criticalDetections[0] : 
//           (highDetections.length > 0 ? highDetections[0] : activeDetections[0]);
//       }
      
//       return {
//         totalActive: activeDetections.length,
//         totalResolved: await PestDiseaseDetection.countDocuments({
//           userId: new mongoose.Types.ObjectId(userId),
//           farmId,
//           resolved: true
//         }),
//         byType,
//         bySeverity,
//         highestRisk: highestRisk ? {
//           id: highestRisk._id,
//           name: highestRisk.detectionResult.name,
//           type: highestRisk.detectionType,
//           severity: highestRisk.detectionResult.severity,
//           identifiedAt: highestRisk.detectionResult.identifiedAt
//         } : null
//       };
//     } catch (error) {
//       console.error(`Get farm detection summary error: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       throw error;
//     }
//   },

//   // Helper methods
//   async validateUserDetection(detectionId: string, userId: string): Promise<IPestDiseaseDetection> {
//     const detection = await PestDiseaseDetection.findById(detectionId);
//     if (!detection) {
//       throw new Error('Detection not found');
//     }

//     // Check if user owns this detection
//     if (detection.userId.toString() !== userId) {
//       throw new Error('Not authorized to access this detection');
//     }

//     return detection;
//   },

//   // async notifyUser(detection: IPestDiseaseDetection) {
//   //   try {
//   //     // Determine priority based on severity
//   //     let priority: 'low' | 'medium' | 'high' | 'urgent';
//   //     switch (detection.detectionResult.severity) {
//   //       case Severity.CRITICAL:
//   //         priority = 'urgent';
//   //         break;
//   //       case Severity.HIGH:
//   //         priority = 'high';
//   //         break;
//   //       case Severity.MEDIUM:
//   //         priority = 'medium';
//   //         break;
//   //       default:
//   //         priority = 'low';
//   //     }

//   //     await notificationService.createNotification({
//   //       userId: detection.userId.toString(),
//   //       title: `${detection.detectionType} Detected: ${detection.detectionResult.name}`,
//   //       message: `${detection.detectionResult.severity} severity ${detection.detectionType} detected in your crop.`,
//   //       type: 'alert',
//   //       category: 'pest_disease',
//   //       priority,
//   //       actionRequired: detection.detectionResult.severity !== Severity.LOW,
//   //       relatedEntityType: 'pestDisease',
//   //       relatedEntityId: detection._id.toString(),
//   //     });
//   //   } catch (error) {
//   //     console.error(`Notification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
//   //     // Don't throw here to prevent the main operation from failing
//   //   }
//   // }
// };

// export default pestDiseaseService;