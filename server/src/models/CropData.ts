import mongoose, { Document, Schema } from 'mongoose';

// Basic Enums
enum GrowthStage {
  GERMINATION = 'germination',
  SEEDLING = 'seedling',
  VEGETATIVE = 'vegetative',
  FLOWERING = 'flowering',
  FRUITING = 'fruiting',
  MATURITY = 'maturity'
}

enum HealthStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical'
}

// Main Interface
export interface ICropData extends Document {
  userId: mongoose.Types.ObjectId;
  farmId: string;
  cropName: string;
  cropType: string;
  plantingDate: Date;
  expectedHarvestDate?: Date;
  growthStage: GrowthStage;
  healthStatus: {
    overall: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    issues: Array<{
      type: 'pest' | 'disease' | 'nutrient' | 'water' | 'other';
      name: string;
      severity: 'low' | 'medium' | 'high';
      detectedAt: Date;
      imageUrl?: string;
      resolved: boolean;
      treatment?: string;
    }>;
  };
  growthMetrics: {
    height?: number;
    leafCount?: number;
    growth: Array<{
      date: Date;
      measurement: number;
      notes: string;
    }>;
  };
  weatherImpact: {
    lastAssessment: Date;
    conditions: string;
    risks: string[];
    adaptations: string[];
  };
  recommendations: {
    irrigation?: {
      frequency: string;
      amount: number;
      unit: string;
    };
    fertilizer?: {
      type: string;
      amount: number;
      timing: string;
    };
    actions: string[];
  };

  // Harvest Planning
  harvestPlan: {
    estimatedYield: number;
    harvestWindow: {
      start: Date;
      end: Date;
    };
    equipment: string[];
    laborNeeded: number;
    status: 'planned' | 'in_progress' | 'completed';
  };
  lastInspection: Date;
  nextInspectionDue: Date;
  notes?: string;
  aiAnalysis?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const CropDataSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmId: {
    type: String,
    required: true
  },
  cropName: {
    type: String,
    required: true,
    trim: true
  },
  cropType: {
    type: String,
    required: true,
    trim: true
  },
  plantingDate: {
    type: Date,
    required: true
  },
  expectedHarvestDate: Date,
  growthStage: {
    type: String,
    enum: Object.values(GrowthStage),
    default: GrowthStage.GERMINATION
  },
  healthStatus: {
    overall: {
      type: String,
      enum: Object.values(HealthStatus),
      default: HealthStatus.GOOD
    },
    issues: [{
      type: {
        type: String,
        enum: ['pest', 'disease', 'nutrient', 'water'],
        required: true
      },
      name: {
        type: String,
        required: true
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
      },
      detectedAt: {
        type: Date,
        default: Date.now
      },
      resolved: {
        type: Boolean,
        default: false
      }
    }]
  },
  growthMetrics: {
    height: Number,
    growth: [{
      date: {
        type: Date,
        required: true
      },
      measurement: {
        type: Number,
        required: true
      }
    }]
  },
  recommendations: {
    irrigation: {
      frequency: String,
      amount: Number
    },
    actions: [String]
  },
  lastInspection: {
    type: Date,
    default: Date.now
  },
  nextInspectionDue: {
    type: Date,
    required: true
  },
  notes: String
}, {
  timestamps: true
});

// Essential Indexes
CropDataSchema.index({ userId: 1, farmId: 1 });
CropDataSchema.index({ cropName: 1 });
CropDataSchema.index({ 'healthStatus.overall': 1 });

// Core Methods
CropDataSchema.methods.needsAttention = function(): boolean {
  const today = new Date();
  return (
    this.nextInspectionDue < today ||
    this.healthStatus.overall === HealthStatus.CRITICAL ||
    this.healthStatus.issues.some((issue: { type: 'pest' | 'disease' | 'nutrient' | 'water'; name: string; severity: 'low' | 'medium' | 'high'; detectedAt: Date; resolved: boolean }) => !issue.resolved && issue.severity === 'high')
  );
};

CropDataSchema.methods.updateGrowthStage = function(): void {
  const plantingAge = Math.ceil(
    (new Date().getTime() - this.plantingDate.getTime()) / 
    (1000 * 60 * 60 * 24)
  );
  
  if (plantingAge <= 7) this.growthStage = GrowthStage.GERMINATION;
  else if (plantingAge <= 21) this.growthStage = GrowthStage.SEEDLING;
  else if (plantingAge <= 45) this.growthStage = GrowthStage.VEGETATIVE;
  else if (plantingAge <= 60) this.growthStage = GrowthStage.FLOWERING;
  else if (plantingAge <= 75) this.growthStage = GrowthStage.FRUITING;
  else this.growthStage = GrowthStage.MATURITY;
};

export const CropData = mongoose.model<ICropData>('CropData', CropDataSchema);

export default CropData;
