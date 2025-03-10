import { IrrigationSchedule, IIrrigationSchedule, AlertType } from '../models/IrrigationSchedule';
import { User } from '../models/User';
import { CropData } from '../models/CropData';
import { SoilAnalysis } from '../models/SoilAnalysis';
import { WeatherData } from '../models/WeatherData';
import { aiService } from './aiService';
//import { notificationService } from './notificationService';
import mongoose from 'mongoose';

interface WaterQuality {
  ph: number;
  salinity: number;
  contaminants?: string[];
}

interface SensorReading {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  location: string;
}

interface FertigationEntry {
  date: Date;
  nutrient: string;
  amount: number;
  unit: string;
}

export const irrigationService = {
  async validateUserAndSchedule(userId: string, scheduleId: string) {
    const irrigationSchedule = await IrrigationSchedule.findById(scheduleId);
    if (!irrigationSchedule) throw new Error('Irrigation schedule not found');
    if (!irrigationSchedule.userId.equals(new mongoose.Types.ObjectId(userId))) {
      throw new Error('Not authorized');
    }
    return irrigationSchedule;
  },

  async generateIrrigationSchedule(
    userId: string,
    farmId: string,
    cropDataId: string,
    waterSource: 'groundwater' | 'rainwater' | 'reservoir' | 'canal'
  ): Promise<IIrrigationSchedule> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const farm = user.farmDetails.find(farm => farm?._id?.toString() === farmId);
    if (!farm) throw new Error('Farm not found');

    const [cropData, soilAnalysis, weatherData] = await Promise.all([
      CropData.findOne({ _id: cropDataId, userId }),
      SoilAnalysis.findOne({ userId, farmId }).sort({ createdAt: -1 }),
      WeatherData.findOne({ userId }).sort({ createdAt: -1 })
    ]);

    if (!cropData || !soilAnalysis || !weatherData) {
      throw new Error('Required data not found');
    }

    const aiScheduleResult = await aiService.generateIrrigationSchedule(
      cropData,
      soilAnalysis,
      weatherData,
      waterSource
    );

    const irrigationSchedule = await IrrigationSchedule.create({
      userId: new mongoose.Types.ObjectId(userId),
      farmId,
      cropDataId: new mongoose.Types.ObjectId(cropDataId),
      weatherDataId: weatherData._id,
      soilAnalysisId: soilAnalysis._id,
      schedule: this.mapScheduleItems(aiScheduleResult.schedule),
      waterSource,
      waterConservation: {
        totalSaved: 0,
        efficiency: aiScheduleResult.waterConservation?.efficiency || 0,
        techniques: aiScheduleResult.waterConservation?.techniques || [],
      },
      automationStatus: false,
      sensorReadings: [],
      alerts: [],
      aiRecommendations: aiScheduleResult.analysis,
      fertigation: this.mapFertigationItems(aiScheduleResult.fertigation)
    });

    //await this.notifyNewSchedule(userId, cropData.cropName, irrigationSchedule.userId);
    return irrigationSchedule;
  },

  async getPaginatedSchedules(query: object, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [schedules, total] = await Promise.all([
      IrrigationSchedule.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      IrrigationSchedule.countDocuments(query)
    ]);
    return { schedules, total, page, limit };
  },

  async getUserIrrigationSchedules(userId: string, page = 1, limit = 10) {
    return this.getPaginatedSchedules({ userId: new mongoose.Types.ObjectId(userId) }, page, limit);
  },

  async getFarmIrrigationSchedules(userId: string, farmId: string, page = 1, limit = 10) {
    return this.getPaginatedSchedules({ 
      userId: new mongoose.Types.ObjectId(userId), 
      farmId 
    }, page, limit);
  },

  async getCropIrrigationSchedules(userId: string, cropDataId: string, page = 1, limit = 10) {
    return this.getPaginatedSchedules({ 
      userId: new mongoose.Types.ObjectId(userId), 
      cropDataId: new mongoose.Types.ObjectId(cropDataId) 
    }, page, limit);
  },

  async updateIrrigationStatus(
    scheduleId: string,
    userId: string,
    date: Date,
    status: 'completed' | 'skipped' | 'adjusted',
    adjustmentReason?: string
  ): Promise<IIrrigationSchedule> {
    const irrigationSchedule = await this.validateUserAndSchedule(userId, scheduleId);
    
    const scheduleItem = irrigationSchedule.schedule.find(
      item => item.date.toDateString() === new Date(date).toDateString()
    );
    if (!scheduleItem) throw new Error('Schedule item not found for the given date');

    scheduleItem.status = status;
    if (status === 'adjusted' && adjustmentReason) {
      scheduleItem.adjustmentReason = adjustmentReason;
    }

    // Initialize waterConservation if it doesn't exist
    if (!irrigationSchedule.waterConservation) {
      irrigationSchedule.waterConservation = {
        totalSaved: 0,
        efficiency: 0,
        techniques: []
      };
    }
    
    if (status === 'skipped') {
      irrigationSchedule.waterConservation.totalSaved += scheduleItem.amount;
    }

    await irrigationSchedule.save();
    return irrigationSchedule;
  },

  async addSensorReading(scheduleId: string, userId: string, reading: SensorReading): Promise<IIrrigationSchedule> {
    const irrigationSchedule = await this.validateUserAndSchedule(userId, scheduleId);
    
    irrigationSchedule.sensorReadings.push({
      timestamp: new Date(),
      ...reading
    });

    await this.checkMoistureAndNotify(userId, irrigationSchedule, reading.soilMoisture);
    await irrigationSchedule.save();
    return irrigationSchedule;
  },

  async toggleAutomation(scheduleId: string, userId: string, status: boolean): Promise<IIrrigationSchedule> {
    const irrigationSchedule = await this.validateUserAndSchedule(userId, scheduleId);
    
    irrigationSchedule.automationStatus = status;
    await irrigationSchedule.save();
    
    //await this.notifyAutomationStatus(userId, status, irrigationSchedule.userId);
    return irrigationSchedule;
  },

  async updateWaterQuality(scheduleId: string, userId: string, waterQuality: WaterQuality): Promise<IIrrigationSchedule> {
    const irrigationSchedule = await this.validateUserAndSchedule(userId, scheduleId);
    
    irrigationSchedule.waterQuality = waterQuality;
    await irrigationSchedule.save();
    
    await this.checkWaterQualityAndNotify(userId, waterQuality, irrigationSchedule.userId);
    return irrigationSchedule;
  },

  async addFertigation(scheduleId: string, userId: string, fertigation: FertigationEntry): Promise<IIrrigationSchedule> {
    const irrigationSchedule = await this.validateUserAndSchedule(userId, scheduleId);
    
    if (!irrigationSchedule.fertigation) {
      irrigationSchedule.fertigation = [];
    }
    
    irrigationSchedule.fertigation.push(fertigation);
    await irrigationSchedule.save();
    return irrigationSchedule;
  },

  // Helper methods
  mapScheduleItems(schedule: any[]) {
    return schedule.map(item => ({
      date: new Date(item.date),
      status: 'scheduled',
      amount: item.amount,
      unit: item.unit,
      duration: item.duration,
      startTime: item.startTime,
      method: item.method,
    }));
  },

  mapFertigationItems(fertigation: any[]) {
    if (!fertigation || !Array.isArray(fertigation)) {
      return [];
    }
    
    return fertigation.map(item => ({
      date: new Date(item.date),
      nutrient: item.nutrient,
      amount: item.amount,
      unit: item.unit,
    }));
  },

  // async notifyNewSchedule(userId: string, cropName: string, scheduleId: mongoose.Types.ObjectId) {
  //   await notificationService.createNotification({
  //     userId,
  //     title: 'New Irrigation Schedule Generated',
  //     message: `A new irrigation schedule has been created for your ${cropName}.`,
  //     type: 'info',
  //     category: 'irrigation',
  //     priority: 'medium',
  //     actionRequired: false,
  //     relatedEntityType: 'irrigation',
  //     relatedEntityId: scheduleId.toString(),
  //   });
  // },
  
  async checkMoistureAndNotify(userId: string, schedule: IIrrigationSchedule, moistureLevel: number) {
    // Check if moisture level is too low or too high
    if (moistureLevel < 20) {
      // Create alert in the schedule
      schedule.alerts.push({
        timestamp: new Date(),
        type: AlertType.LOW_MOISTURE,
        message: 'Soil moisture critically low. Irrigation needed.',
        resolved: false
      });
      
      // Send notification
    //   await notificationService.createNotification({
    //     userId,
    //     title: 'Low Soil Moisture Alert',
    //     message: 'Soil moisture level is critically low. Immediate irrigation recommended.',
    //     type: 'alert',
    //     category: 'irrigation',
    //     priority: 'high',
    //     actionRequired: true,
    //     relatedEntityType: 'irrigation',
    //     relatedEntityId: schedule.userId.toString(),
    //   });
    // } else if (moistureLevel > 80) {
    //   // Create alert in the schedule
    //   schedule.alerts.push({
    //     timestamp: new Date(),
    //     type: AlertType.HIGH_MOISTURE,
    //     message: 'Soil moisture too high. Risk of waterlogging.',
    //     resolved: false
    //   });
      
      // Send notification
      // await notificationService.createNotification({
      //   userId,
      //   title: 'High Soil Moisture Alert',
      //   message: 'Soil moisture level is too high. Consider reducing irrigation.',
      //   type: 'alert',
      //   category: 'irrigation',
      //   priority: 'medium',
      //   actionRequired: true,
      //   relatedEntityType: 'irrigation',
      //   relatedEntityId: schedule.userId.toString(),
      // });
    }
  },
  
  // async notifyAutomationStatus(userId: string, status: boolean, scheduleId: mongoose.Types.ObjectId) {
  //   await notificationService.createNotification({
  //     userId,
  //     title: `Irrigation Automation ${status ? 'Enabled' : 'Disabled'}`,
  //     message: `Automatic irrigation has been ${status ? 'enabled' : 'disabled'} for your field.`,
  //     type: 'info',
  //     category: 'irrigation',
  //     priority: 'medium',
  //     actionRequired: false,
  //     relatedEntityType: 'irrigation',
  //     relatedEntityId: scheduleId.toString(),
  //   });
  // },
  
  async checkWaterQualityAndNotify(userId: string, waterQuality: WaterQuality, scheduleId: mongoose.Types.ObjectId) {
    const issues = [];
    
    if (waterQuality.ph < 5.5 || waterQuality.ph > 8.5) {
      issues.push(`pH level (${waterQuality.ph}) outside optimal range`);
    }
    
    if (waterQuality.salinity > 2000) {
      issues.push(`High salinity detected (${waterQuality.salinity} ppm)`);
    }
    
    if (waterQuality.contaminants && waterQuality.contaminants.length > 0) {
      issues.push(`Contaminants detected: ${waterQuality.contaminants.join(', ')}`);
    }
    
  //   if (issues.length > 0) {
  //     await notificationService.createNotification({
  //       userId,
  //       title: 'Water Quality Issues Detected',
  //       message: `Issues with irrigation water: ${issues.join('; ')}`,
  //       type: 'alert',
  //       category: 'irrigation',
  //       priority: 'high',
  //       actionRequired: true,
  //       relatedEntityType: 'irrigation',
  //       relatedEntityId: scheduleId.toString(),
  //     });
  //   }
  }
};

export default irrigationService;