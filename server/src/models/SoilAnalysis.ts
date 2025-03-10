import mongoose, { Document, Schema } from 'mongoose';

// Simple Enums
export enum UnitType {
  KG_HA = 'kg/ha',
  G_M2 = 'g/m²',
  PPM = 'ppm',
  PERCENT = '%'
}

export enum SoilType {
  CLAY = 'clay',
  SILT = 'silt',
  SAND = 'sand',
  LOAM = 'loam'
}

// Interface
export interface ISoilAnalysis extends Document {
  userId: mongoose.Types.ObjectId;
  farmId: string;
  sampleId: string;
  location: {
    coordinates: number[];
    sampleDepth: number;
  };
  samplingDate: Date;
  results: {
    nutrients: {
      nitrogen: number;
      phosphorus: number;
      potassium: number;
      other?: Record<string, number>;
      units: UnitType;
    };
    ph: number;
    salinity: number;
    moisture: number;
    organicMatter: number;
    texture: SoilType;
  };
  recommendations: {
    fertilizers: Array<{
      type: string;
      amount: number;
      unit: UnitType;
    }>;
    amendments: Array<{
      type: string;
      amount: number;
      unit: UnitType;
    }>;
    practices: string[];
  };
  analysis: {
    summary: string;
    issues: string[];
    improvements: string[];
  };
  notes?: string;
  nextAnalysisDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const SoilAnalysisSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  farmId: {
    type: String,
    required: true,
  },
  sampleId: {
    type: String,
    required: true,
  },
  location: {
    coordinates: {
      type: [Number],
      required: true,
    },
    sampleDepth: {
      type: Number,
      required: true,
    },
  },
  samplingDate: {
    type: Date,
    required: true,
  },
  results: {
    nutrients: {
      nitrogen: Number,
      phosphorus: Number,
      potassium: Number,
      other: Map,
      units: {
        type: String,
        enum: Object.values(UnitType),
      },
    },
    ph: Number,
    salinity: Number,
    moisture: Number,
    organicMatter: Number,
    texture: {
      type: String,
      enum: Object.values(SoilType),
    },
  },
  recommendations: {
    fertilizers: [{
      type: String,
      amount: Number,
      unit: String,
    }],
    amendments: [{
      type: String,
      amount: Number,
      unit: String,
    }],
    practices: [String],
  },
  analysis: {
    summary: String,
    issues: [String],
    improvements: [String],
  },
  notes: String,
  nextAnalysisDate: Date,
}, {
  timestamps: true,
});

// Basic Indexes
SoilAnalysisSchema.index({ farmId: 1, samplingDate: -1 });

export const SoilAnalysis = mongoose.model<ISoilAnalysis>('SoilAnalysis', SoilAnalysisSchema);

export default SoilAnalysis;
