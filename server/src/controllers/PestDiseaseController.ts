// src/controllers/PestDiseaseController.ts
import { Request, Response, NextFunction } from 'express';
import pestDiseaseService from '../services/pestDiseaseService';

export const PestDiseaseController = {
  // Detect pests or diseases using AI image analysis
  async detectWithAI(req: Request, res: Response, next: NextFunction) : Promise<any>{
    try {
      const userId = req.user?.id;
      const { farmId, cropId, imageUrl, location } = req.body;
      const detection = await pestDiseaseService.detectWithAI(userId, farmId, cropId, imageUrl, location);
      return res.status(201).json({
        success: true,
        message: 'Pest/Disease detected successfully using AI',
        data: detection,
      });
    } catch (error) {
      next(error);
    }
  },

  // Add a manual pest or disease detection record
  async addManualDetection(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { farmId, cropId, detectionData } = req.body;
      const detection = await pestDiseaseService.addManualDetection(userId, farmId, cropId, detectionData);
      return res.status(201).json({
        success: true,
        message: 'Manual pest/disease detection recorded successfully',
        data: detection,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get detection details by detection ID
  async getDetection(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { detectionId } = req.params;
      const detection = await pestDiseaseService.getDetection(detectionId, userId);
      return res.status(200).json({
        success: true,
        data: detection,
      });
    } catch (error) {
      next(error);
    }
  },

  // List all detections for a given farm with optional filtering and pagination
  async getFarmDetections(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { farmId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      // Pass any additional filters from query parameters
      const filters = req.query;
      const result = await pestDiseaseService.getFarmDetections(userId, farmId, filters, page, limit);
      return res.status(200).json({
        success: true,
        data: result.detections,
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      next(error);
    }
  },

  // List all detections for a given crop with optional filtering and pagination
  async getCropDetections(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { cropId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const filters = req.query;
      const result = await pestDiseaseService.getCropDetections(userId, cropId, filters, page, limit);
      return res.status(200).json({
        success: true,
        data: result.detections,
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      next(error);
    }
  },

  // Record treatment details for a detection
  async recordTreatment(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { detectionId } = req.params;
      const treatmentData = req.body;
      const updatedDetection = await pestDiseaseService.recordTreatment(detectionId, userId, treatmentData);
      return res.status(200).json({
        success: true,
        message: 'Treatment recorded successfully',
        data: updatedDetection,
      });
    } catch (error) {
      next(error);
    }
  },

  // Mark a detection as resolved
  async resolveDetection(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { detectionId } = req.params;
      const resolutionData = req.body;
      const updatedDetection = await pestDiseaseService.resolveDetection(detectionId, userId, resolutionData);
      return res.status(200).json({
        success: true,
        message: 'Detection resolved successfully',
        data: updatedDetection,
      });
    } catch (error) {
      next(error);
    }
  },

  // Generate a treatment plan for a detection using AI
  async generateTreatmentPlan(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { detectionId } = req.params;
      const treatmentPlan = await pestDiseaseService.generateTreatmentPlan(detectionId, userId);
      return res.status(200).json({
        success: true,
        message: 'Treatment plan generated successfully',
        data: treatmentPlan,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default PestDiseaseController;