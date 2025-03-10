import mongoose, { Document, Schema } from 'mongoose';

// Basic Interfaces
interface IBasicMeasurement {
  amount: number;
  unit: string;
}

export interface ICropDetails {
  cropName: string;
  suitabilityScore: number;
  expectedYield: IBasicMeasurement;
  waterNeeds: IBasicMeasurement & {
    frequency: string;
  };
  fertilizer: {
    type: string;
    amount: number;
    timing: string;
  };
  schedule: {
    plantingStart: Date;
    plantingEnd: Date;
    harvestStart: Date;
    harvestEnd: Date;
  };
  economics: {
    estimatedCost: number;
    estimatedRevenue: number;
    currency: string;
  };
  risks: string[];
  benefits: string[];
}

// Main Interface
export interface ICropRecommendation extends Document {
  userId: mongoose.Types.ObjectId;
  farmId: string;
  soilAnalysisId: mongoose.Types.ObjectId;
  preferences: {
    cropType?: string;
    season?: string;
    waterAvailability?: 'low' | 'medium' | 'high';
    marketFocus?: 'local' | 'export';
  };
  recommendations: ICropDetails[];
  selectedCrop?: ICropDetails & {
    selectedAt: Date;
    status: 'pending' | 'in_progress' | 'implemented';
    actualCosts?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const CropDetailsSchema = new Schema({
  cropName: {
    type: String,
    required: true
  },
  suitabilityScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  expectedYield: {
    amount: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    }
  },
  waterNeeds: {
    amount: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    frequency: String
  },
  fertilizer: {
    type: String,
    amount: Number,
    timing: String
  },
  schedule: {
    plantingStart: Date,
    plantingEnd: Date,
    harvestStart: Date,
    harvestEnd: Date
  },
  economics: {
    estimatedCost: Number,
    estimatedRevenue: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  risks: [String],
  benefits: [String]
});

const CropRecommendationSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmId: {
    type: String,
    required: true
  },
  soilAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SoilAnalysis',
    required: true
  },
  preferences: {
    cropType: String,
    season: String,
    waterAvailability: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    marketFocus: {
      type: String,
      enum: ['local', 'export']
    }
  },
  recommendations: [CropDetailsSchema],
  selectedCrop: {
    type: CropDetailsSchema,
    selectedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'implemented'],
      default: 'pending'
    },
    actualCosts: Number
  }
}, {
  timestamps: true
});

// Essential Indexes
CropRecommendationSchema.index({ userId: 1, farmId: 1 });
CropRecommendationSchema.index({ 'selectedCrop.cropName': 1 });

// Core Methods
CropRecommendationSchema.virtual('roi').get(function() {
  if (this.selectedCrop?.economics) {
    const { estimatedRevenue, estimatedCost } = this.selectedCrop.economics;
    if (estimatedRevenue != null && estimatedCost != null) {
      return ((estimatedRevenue - estimatedCost) / estimatedCost) * 100;
    }
    return null;
  }
  return null;
});

CropRecommendationSchema.methods.isReadyToPlant = function(): boolean {
  if (this.selectedCrop?.schedule?.plantingStart) {
    return new Date() >= this.selectedCrop.schedule.plantingStart;
  }
  return false;
};

export const CropRecommendation = mongoose.model<ICropRecommendation>(
  'CropRecommendation', 
  CropRecommendationSchema
);

export default CropRecommendation;
