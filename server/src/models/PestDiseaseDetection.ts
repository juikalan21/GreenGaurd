import mongoose, { Document, Schema } from 'mongoose';

// Basic Enums
enum DetectionType {
  PEST = 'pest',
  DISEASE = 'disease',
  NUTRIENT_DEFICIENCY = 'nutrient_deficiency',
  WEED = 'weed',
  OTHER = 'other'
}

enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

enum TreatmentType {
  CHEMICAL = 'chemical',
  BIOLOGICAL = 'biological',
  CULTURAL = 'cultural',
  MECHANICAL = 'mechanical',
  INTEGRATED = 'integrated'
}

// Main Interface
export interface IPestDiseaseDetection extends Document {
  userId: mongoose.Types.ObjectId;
  farmId: string;
  cropId: mongoose.Types.ObjectId;
  location: {
    coordinates: number[];
  };
  images: {
    original: string;
    processed?: string;
  }[];
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
    current: 'detected' | 'in_treatment' | 'resolved';
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
      enum: ['detected', 'in_treatment', 'resolved'],
      default: 'detected'
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

// Essential Methods
PestDiseaseDetectionSchema.methods.markResolved = async function() {
  this.resolved = true;
  this.resolvedAt = new Date();
  this.status.current = 'resolved';
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
