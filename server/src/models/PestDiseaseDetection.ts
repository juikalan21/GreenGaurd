import mongoose, { Document, Schema } from 'mongoose';

// Basic Enums - exported for use in services
export enum DetectionType {
  PEST = 'pest',
  DISEASE = 'disease',
  NUTRIENT_DEFICIENCY = 'nutrient_deficiency',
  WEED = 'weed',
  OTHER = 'other'
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TreatmentType {
  CHEMICAL = 'chemical',
  BIOLOGICAL = 'biological',
  CULTURAL = 'cultural',
  MECHANICAL = 'mechanical',
  INTEGRATED = 'integrated'
}

export enum DetectionStatus {
  DETECTED = 'detected',
  IN_TREATMENT = 'in_treatment',
  RESOLVED = 'resolved'
}

// Main Interface
export interface IPestDiseaseDetection extends Document {
  userId: mongoose.Types.ObjectId;
  farmId: string;
  cropId: mongoose.Types.ObjectId;
  location: {
    coordinates: number[];
  };
  images: Array<{
    original: string;
    processed?: string;
  }>;
  detectionType: DetectionType;
  detectionResult: {
    name: string;
    confidence: number;
    severity: Severity;
    affectedArea: number;
    identifiedAt: Date;
  };
  symptoms: {
    observed: string[];
    severity: Severity;
  };
  recommendations: {
    treatments: Array<{
      name: string;
      type: TreatmentType;
      dosage: string;
      frequency: string;
    }>;
    preventive: string[];
  };
  status: {
    current: DetectionStatus;
    history: Array<{
      status: string;
      date: Date;
    }>;
  };
  resolved: boolean;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  markResolved(resolutionMethod?: string): Promise<void>;
}

// Schema
const PestDiseaseDetectionSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmId: {
    type: String,
    required: true
  },
  cropId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: true
  },
  location: {
    coordinates: {
      type: [Number],
      required: true
    }
  },
  images: [{
    original: String,
    processed: String
  }],
  detectionType: {
    type: String,
    enum: Object.values(DetectionType),
    required: true
  },
  detectionResult: {
    name: { type: String, required: true },
    confidence: { type: Number, required: true },
    severity: { type: String, enum: Object.values(Severity), required: true },
    affectedArea: { type: Number, required: true },
    identifiedAt: { type: Date, default: Date.now }
  },
  symptoms: {
    observed: [String],
    severity: { type: String, enum: Object.values(Severity) }
  },
  recommendations: {
    treatments: [{
      name: String,
      type: { type: String, enum: Object.values(TreatmentType) },
      dosage: String,
      frequency: String
    }],
    preventive: [String]
  },
  status: {
    current: {
      type: String,
      enum: Object.values(DetectionStatus),
      default: DetectionStatus.DETECTED
    },
    history: [{
      status: String,
      date: { type: Date, default: Date.now }
    }]
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  notes: String
}, {
  timestamps: true
});

// Basic Indexes
PestDiseaseDetectionSchema.index({ farmId: 1, 'detectionResult.identifiedAt': -1 });
PestDiseaseDetectionSchema.index({ resolved: 1 });
PestDiseaseDetectionSchema.index({ userId: 1, farmId: 1 });
PestDiseaseDetectionSchema.index({ cropId: 1 });
PestDiseaseDetectionSchema.index({ 'detectionResult.severity': 1 });

// Essential Methods
PestDiseaseDetectionSchema.methods.markResolved = async function(resolutionMethod?: string): Promise<void> {
  this.resolved = true;
  this.resolvedAt = new Date();
  this.status.current = DetectionStatus.RESOLVED;
  
  if (resolutionMethod) {
    this.notes = this.notes 
      ? `${this.notes}\nResolution method: ${resolutionMethod}` 
      : `Resolution method: ${resolutionMethod}`;
  }
  
  this.status.history.push({
    status: DetectionStatus.RESOLVED,
    date: new Date()
  });
  
  await this.save();
};

// Basic Static Method
PestDiseaseDetectionSchema.statics.getActiveCases = function(farmId: string) {
  return this.find({
    farmId,
    resolved: false
  }).sort({ 'detectionResult.identifiedAt': -1 });
};

export const PestDiseaseDetection = mongoose.model<IPestDiseaseDetection>(
  'PestDiseaseDetection',
  PestDiseaseDetectionSchema
);

export default PestDiseaseDetection;