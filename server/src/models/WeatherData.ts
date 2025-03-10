import mongoose, { Document, Schema } from 'mongoose';

// Basic Enums
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

enum WeatherCondition {
  FAVORABLE = 'favorable',
  NEUTRAL = 'neutral',
  UNFAVORABLE = 'unfavorable'
}

// Simplified Interfaces
interface IBasicWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainfall: number;
  condition: string;
  pressure?: number;
  visibility?: number;
  soilTemperature?: number;
  leafWetness?: number;
}

interface ILocation {
  name: string;
  state: string;
  coordinates: number[];
  elevation?: number;
}

// Main Interface
export interface IWeatherData extends Document {
  userId: mongoose.Types.ObjectId;
  farmId: string;
  location: ILocation;
  current: IBasicWeather & {
    timestamp: Date;
    uvIndex: number;
  };
  forecast: Array<{
    date: Date;
    dayTemp: number;
    nightTemp: number;
    rainfall: number;
    windSpeed: number;
    condition: string;
    hourly: Array<{
      time: string;
      temp: number;
      rainfall: number;
      condition: string;
    }>;
  }>;
  alerts: Array<{
    type: string;
    severity: RiskLevel;
    description: string;
    startTime: Date;
    endTime: Date;
  }>;
  farmImpact: {
    soilMoisture: string;
    cropHealth: string;
    irrigationNeeded: boolean;
    risks: {
      pest: RiskLevel;
      disease: RiskLevel;
      frost?: boolean;
      heat?: boolean;
    };
    yieldImpact: {
      status: string;
      percentage: number;
    };
    recommendations: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
    fieldWork: {
      suitable: boolean;
      activities: string[];
    };
  };
  lastUpdated: Date;
  nextUpdate: Date;
}

// Schema
const WeatherDataSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmId: {
    type: String,
    required: true
  },
  location: {
    name: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords: number[]) => 
          coords.length === 2 &&
          coords[0] >= -180 && coords[0] <= 180 &&
          coords[1] >= -90 && coords[1] <= 90,
        message: 'Invalid coordinates'
      }
    },
    elevation: Number
  },
  current: {
    timestamp: {
      type: Date,
      required: true
    },
    temperature: Number,
    humidity: Number,
    windSpeed: Number,
    rainfall: Number,
    condition: String,
    uvIndex: Number
  },
  forecast: [{
    date: {
      type: Date,
      required: true
    },
    dayTemp: Number,
    nightTemp: Number,
    rainfall: Number,
    windSpeed: Number,
    condition: String,
    hourly: [{
      time: String,
      temp: Number,
      rainfall: Number,
      condition: String
    }]
  }],
  alerts: [{
    type: String,
    severity: {
      type: String,
      enum: Object.values(RiskLevel)
    },
    description: String,
    startTime: Date,
    endTime: Date
  }],
  farmImpact: {
    soilMoisture: String,
    cropHealth: String,
    irrigationNeeded: Boolean,
    risks: {
      pest: {
        type: String,
        enum: Object.values(RiskLevel)
      },
      disease: {
        type: String,
        enum: Object.values(RiskLevel)
      },
      frost: Boolean,
      heat: Boolean
    },
    yieldImpact: {
      status: String,
      percentage: Number
    },
    recommendations: {
      immediate: [String],
      shortTerm: [String],
      longTerm: [String]
    },
    fieldWork: {
      suitable: Boolean,
      activities: [String]
    }
  },
  lastUpdated: {
    type: Date,
    required: true
  },
  nextUpdate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Essential Indexes
WeatherDataSchema.index({ location: '2dsphere' });
WeatherDataSchema.index({ 'current.timestamp': -1 });
WeatherDataSchema.index({ userId: 1, farmId: 1 });

// Core Methods
WeatherDataSchema.methods.getWeatherSummary = function() {
  return {
    temperature: this.current.temperature,
    condition: this.current.condition,
    alerts: this.alerts.length,
    needsIrrigation: this.farmImpact.irrigationNeeded
  };
};

WeatherDataSchema.methods.isOutdated = function(): boolean {
  return new Date() > this.nextUpdate;
};

export const WeatherData = mongoose.model<IWeatherData>(
  'WeatherData', 
  WeatherDataSchema
);

export default WeatherData;