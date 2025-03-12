// src/controllers/IrrigationController.ts
import { Request, Response, NextFunction } from 'express';
import irrigationService from '../services/irrigationService';

export const IrrigationController = {
  // Generate a new irrigation schedule
  async generateSchedule(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { farmId, cropDataId, waterSource } = req.body;
      const schedule = await irrigationService.generateIrrigationSchedule(
        userId,
        farmId,
        cropDataId,
        waterSource
      );
      return res.status(201).json({
        success: true,
        message: 'Irrigation schedule generated successfully',
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  },

  // List irrigation schedules for the authenticated user with pagination
  async getUserSchedules(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await irrigationService.getUserIrrigationSchedules(userId, page, limit);
      return res.status(200).json({
        success: true,
        data: result.schedules,
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

  // List irrigation schedules for a specific farm
  async getFarmSchedules(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { farmId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await irrigationService.getFarmIrrigationSchedules(userId, farmId, page, limit);
      return res.status(200).json({
        success: true,
        data: result.schedules,
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

  // List irrigation schedules for a specific crop
  async getCropSchedules(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const userId = req.user?.id;
      const { cropDataId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await irrigationService.getCropIrrigationSchedules(userId, cropDataId, page, limit);
      return res.status(200).json({
        success: true,
        data: result.schedules,
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

  // Update irrigation schedule status for a specific date
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { scheduleId } = req.params;
      const { date, status, adjustmentReason } = req.body;
      const updatedSchedule = await irrigationService.updateIrrigationStatus(
        scheduleId,
        req.user?.id,
        new Date(date),
        status,
        adjustmentReason
      );
      return res.status(200).json({
        success: true,
        message: 'Irrigation schedule status updated successfully',
        data: updatedSchedule,
      });
    } catch (error) {
      next(error);
    }
  },

  // Add a sensor reading to an irrigation schedule
  async addSensorReading(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { scheduleId } = req.params;
      const reading = req.body; // Expected properties: soilMoisture, temperature, humidity, location
      const updatedSchedule = await irrigationService.addSensorReading(
        scheduleId,
        req.user?.id,
        reading
      );
      return res.status(200).json({
        success: true,
        message: 'Sensor reading added successfully',
        data: updatedSchedule,
      });
    } catch (error) {
      next(error);
    }
  },

  // Toggle irrigation automation on or off
  async toggleAutomation(req: Request, res: Response, next: NextFunction) : Promise<any>{
    try {
      const { scheduleId } = req.params;
      const { status } = req.body; // Boolean: true for enabled, false for disabled
      const updatedSchedule = await irrigationService.toggleAutomation(
        scheduleId,
        req.user?.id,
        status
      );
      return res.status(200).json({
        success: true,
        message: 'Irrigation automation status updated successfully',
        data: updatedSchedule,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update water quality data for a schedule
  async updateWaterQuality(req: Request, res: Response, next: NextFunction) : Promise<any>{
    try {
      const { scheduleId } = req.params;
      const waterQuality = req.body; // Expected properties: ph, salinity, contaminants (optional)
      const updatedSchedule = await irrigationService.updateWaterQuality(
        scheduleId,
        req.user?.id,
        waterQuality
      );
      return res.status(200).json({
        success: true,
        message: 'Water quality updated successfully',
        data: updatedSchedule,
      });
    } catch (error) {
      next(error);
    }
  },

  // Add a fertigation entry to a schedule
  async addFertigation(req: Request, res: Response, next: NextFunction) : Promise<any>{
    try {
      const { scheduleId } = req.params;
      const fertigationData = req.body; // Expected properties: date, nutrient, amount, unit
      const updatedSchedule = await irrigationService.addFertigation(
        scheduleId,
        req.user?.id,
        fertigationData
      );
      return res.status(200).json({
        success: true,
        message: 'Fertigation entry added successfully',
        data: updatedSchedule,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default IrrigationController;