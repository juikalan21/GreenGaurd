// src/controllers/SoilAnalysisController.ts
import { Request, Response, NextFunction } from 'express';
import { soilAnalysisService } from '../services/soilAnalysisService';

export const SoilAnalysisController = {
  // Create a new soil analysis record
  async createAnalysis(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const userId = req.user?.id;
      const { farmId, sampleId, location, samplingDate, notes } = req.body;
      const analysis = await soilAnalysisService.createAnalysis(userId, farmId, {
        sampleId,
        location,
        samplingDate: new Date(samplingDate),
        notes,
      });
      return res.status(201).json({
        success: true,
        message: 'Soil analysis created successfully',
        data: analysis,
      });
    } catch (error) {
      next(error);
    }
  },

  // Upload an image for an existing soil analysis and trigger AI analysis
  async uploadAndAnalyze(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const { analysisId } = req.params;
      // The image file is expected in req.file (e.g., multer)
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
      }
      const analysis = await soilAnalysisService.uploadAndAnalyze(analysisId, file);
      return res.status(200).json({
        success: true,
        message: 'Image uploaded and analysis updated successfully',
        data: analysis,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get details of a specific soil analysis
  async getAnalysis(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const { analysisId } = req.params;
      const userId = req.user?.id;
      const analysis = await soilAnalysisService.getAnalysis(analysisId, userId);
      return res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get paginated soil analyses for a specific farm
  async getFarmAnalyses(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const userId = req.user?.id;
      const { farmId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await soilAnalysisService.getFarmAnalyses(farmId, userId, page, limit);
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

  // Update the notes for a soil analysis
  async updateNotes(req: Request, res: Response, next: NextFunction): Promise<any>  {
    try {
      const { analysisId } = req.params;
      const userId = req.user?.id;
      const { notes } = req.body;
      const updatedAnalysis = await soilAnalysisService.updateNotes(analysisId, userId, notes);
      return res.status(200).json({
        success: true,
        message: 'Notes updated successfully',
        data: updatedAnalysis,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default SoilAnalysisController;