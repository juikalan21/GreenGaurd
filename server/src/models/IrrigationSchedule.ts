import mongoose, { Document, Schema } from 'mongoose';

// Basic Enums
export enum IrrigationMethod {
  DRIP = 'drip',
  SPRINKLER = 'sprinkler',
  FLOOD = 'flood',
  MANUAL = 'manual'
}

export enum AlertType {
  LEAK = 'leak',
  PUMP_FAILURE = 'pump_failure',
  LOW_MOISTURE = 'low_moisture',
  HIGH_MOISTURE = 'high_moisture',
  SYSTEM_OFFLINE = 'system_offline'
}

// Main Interface
export interface IIrrigationSchedule extends Document {
  userId: mongoose.Types.ObjectId;
  farmId: string;
  cropDataId: mongoose.Types.ObjectId;
  weatherDataId?: mongoose.Types.ObjectId;
  soilAnalysisId?: mongoose.Types.ObjectId;
  schedule: Array<{
    date: Date;
    status: 'scheduled' | 'completed' | 'skipped' | 'adjusted';
    amount: number;
    duration: number;
    method: IrrigationMethod;
    actualWaterUsed?: number;
    startTime?: string;
    unit?: string;
    adjustmentReason?: string;
  }>;
  waterSource: 'groundwater' | 'rainwater' | 'reservoir' | 'canal';
  waterQuality?: {
    ph: number;
    salinity: number;
    contaminants?: string[];
  };
  sensorReadings: Array<{
    timestamp: Date;
    soilMoisture: number;
    temperature: number;
    humidity: number;
    location: string;
  }>;
  alerts: Array<{
    timestamp: Date;
    type: AlertType;
    message: string;
    resolved: boolean;
    resolvedAt?: Date;
  }>;
  automationStatus: boolean;
  automationConfig?: {
    moistureThreshold: number;
    scheduleOverride: boolean;
    emergencyShutoff: boolean;
  };
  waterConservation?: {
    totalSaved: number;
    efficiency: number;
    techniques: string[];
  };
  fertigation?: Array<{
    date: Date;
    nutrient: string;
    amount: number;
    unit: string;
  }>;
  aiRecommendations?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const IrrigationScheduleSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmId: {
    type: String,
    required: true
  },
  cropDataId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CropData',
    required: true
  },
  weatherDataId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WeatherData'
  },
  soilAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SoilAnalysis'
  },
  schedule: [{
    date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'skipped', 'adjusted'],
      default: 'scheduled'
    },
    amount: {
      type: Number,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      enum: Object.values(IrrigationMethod),
      required: true
    },
    actualWaterUsed: Number,
    startTime: String,
    unit: String,
    adjustmentReason: String
  }],
  waterSource: {
    type: String,
    enum: ['groundwater', 'rainwater', 'reservoir', 'canal'],
    required: true
  },
  waterQuality: {
    ph: Number,
    salinity: Number,
    contaminants: [String]
  },
  sensorReadings: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    soilMoisture: Number,
    temperature: Number,
    humidity: Number,
    location: String
  }],
  alerts: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: Object.values(AlertType)
    },
    message: String,
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date
  }],
  automationStatus: {
    type: Boolean,
    default: false
  },
  automationConfig: {
    moistureThreshold: Number,
    scheduleOverride: Boolean,
    emergencyShutoff: Boolean
  },
  waterConservation: {
    totalSaved: {
      type: Number,
      default: 0
    },
    efficiency: {
      type: Number,
      default: 0
    },
    techniques: [String]
  },
  fertigation: [{
    date: Date,
    nutrient: String,
    amount: Number,
    unit: String
  }],
  aiRecommendations: Schema.Types.Mixed
}, {
  timestamps: true
});

// Basic Indexes
IrrigationScheduleSchema.index({ userId: 1, farmId: 1 });
IrrigationScheduleSchema.index({ 'schedule.date': 1 });

// Essential Methods
IrrigationScheduleSchema.methods.getActiveSchedule = function() {
  return this.schedule.filter((s: { status: string }) => s.status === 'scheduled');
};

IrrigationScheduleSchema.methods.getUnresolvedAlerts = function() {
  return this.alerts.filter((alert: { resolved: boolean }) => !alert.resolved);
};

export const IrrigationSchedule = mongoose.model<IIrrigationSchedule>(
  'IrrigationSchedule', 
  IrrigationScheduleSchema
);

export default IrrigationSchedule;