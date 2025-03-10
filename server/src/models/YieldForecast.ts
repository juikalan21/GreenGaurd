import mongoose, { Document, Schema } from 'mongoose';

// Core Enums
export enum ForecastPeriod {
  SHORT = 'short',    // 1-2 weeks
  MEDIUM = 'medium',  // 1-3 months
  LONG = 'long'      // 3+ months
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum Unit {
  KG = 'kg',
  TON = 'ton',
  HECTARE = 'ha'
}

export enum Trend {
  UP = 'increasing',
  STABLE = 'stable',
  DOWN = 'decreasing'
}

export enum CropHealthStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

// Interfaces
interface IYieldMetrics {
  amount: number;
  unit: Unit;
  confidence: number;
  perArea: number;
}

interface IRisk {
  level: RiskLevel;
  details: string;
  mitigation?: string[];
  lastAssessment?: Date;
}

interface IHistoricalYield {
  year: number;
  amount: number;
  unit: Unit;
  season?: string;
  notes?: string;
}

// Main Interface
export interface IYieldForecast extends Document {
  userId: mongoose.Types.ObjectId;
  farmId: string;
  cropId: mongoose.Types.ObjectId;
  
  crop: {
    name: string;
    variety: string;
    plantingDate: Date;
    harvestDate: Date;
    health: CropHealthStatus;
    growthStage?: string;
    fieldLocation?: {
      lat: number;
      lng: number;
    };
  };

  forecast: {
    period: ForecastPeriod;
    date: Date;
    confidence: number;
    yield: IYieldMetrics;
    lastUpdated: Date;
    nextUpdateDue: Date;
  };

  history: {
    previousYields: IHistoricalYield[];
    average: number;
    trend: Trend;
    seasonalVariation?: number;
  };

  factors: {
    weather: IRisk;
    soil: IRisk;
    pests: IRisk;
    diseases: IRisk;
    lastAssessment: Date;
  };

  market: {
    price: {
      current: number;
      forecast: number;
      currency: string;
      lastUpdated: Date;
    };
    demand: Trend;
    supply: Trend;
    projectedRevenue: number;
    marketConditions?: string;
  };

  recommendations: {
    fertilizer: Array<{
      type: string;
      timing: string;
      amount: number;
      frequency?: string;
      method?: string;
    }>;
    irrigation: Array<{
      schedule: string;
      amount: number;
      method?: string;
      duration?: number;
    }>;
    pestControl: Array<{
      type: string;
      timing: string;
      method?: string;
      frequency?: string;
    }>;
    priority: 'high' | 'medium' | 'low';
  };

  risks: {
    overall: RiskLevel;
    details: Record<string, RiskLevel>;
    mitigation: string[];
    contingencyPlans?: string[];
  };

  sustainability: {
    waterEfficiency: number;
    soilHealth: string;
    carbonFootprint?: number;
    biodiversityImpact?: string;
  };

  analysis: {
    summary: string;
    confidence: number;
    recommendations: string[];
    keyInsights?: string[];
    dataQuality?: number;
  };

  metadata: {
    version: number;
    source: string;
    accuracy: number;
    lastValidated: Date;
  };

  createdAt: Date;
  updatedAt: Date;

  getYieldTrend(): {
    current: number;
    historical: number;
    trend: Trend;
    confidence: number;
  };
}

// Schema
const YieldForecastSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  farmId: { type: String, required: true },
  cropId: { type: Schema.Types.ObjectId, ref: 'CropData', required: true },

  crop: {
    name: { type: String, required: true },
    variety: { type: String, required: true },
    plantingDate: { type: Date, required: true },
    harvestDate: { type: Date, required: true },
    health: { type: String, enum: Object.values(CropHealthStatus), default: CropHealthStatus.GOOD },
    growthStage: String,
    fieldLocation: {
      lat: Number,
      lng: Number
    }
  },

  forecast: {
    period: { type: String, enum: Object.values(ForecastPeriod), required: true },
    date: { type: Date, required: true },
    confidence: { type: Number, min: 0, max: 100 },
    yield: {
      amount: Number,
      unit: { type: String, enum: Object.values(Unit) },
      confidence: Number,
      perArea: Number
    },
    lastUpdated: { type: Date, default: Date.now },
    nextUpdateDue: Date
  },

  // ... [Previous schema fields remain the same]

  metadata: {
    version: { type: Number, default: 1 },
    source: String,
    accuracy: { type: Number, min: 0, max: 100 },
    lastValidated: { type: Date, default: Date.now }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
YieldForecastSchema.index({ userId: 1, farmId: 1 });
YieldForecastSchema.index({ 'crop.plantingDate': 1 });
YieldForecastSchema.index({ 'forecast.date': 1 });
YieldForecastSchema.index({ 'crop.name': 1, 'crop.variety': 1 });

// Methods
YieldForecastSchema.methods.getYieldTrend = function() {
  return {
    current: this.forecast.yield.amount,
    historical: this.history.average,
    trend: this.history.trend,
    confidence: this.forecast.confidence
  };
};

YieldForecastSchema.methods.getRiskSummary = function() {
  return {
    overall: this.risks.overall,
    keyFactors: Object.entries(this.risks.details)
      .filter(([_, level]) => level === RiskLevel.HIGH)
      .map(([factor]) => factor),
    mitigation: this.risks.mitigation
  };
};

// Static methods
YieldForecastSchema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    'forecast.date': {
      $gte: startDate,
      $lte: endDate
    }
  });
};

export const YieldForecast = mongoose.model<IYieldForecast>('YieldForecast', YieldForecastSchema);
export default YieldForecast;