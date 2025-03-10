import mongoose, { Document, Schema } from 'mongoose';

// Core Enums
enum ForecastPeriod {
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long'
}

enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

enum Unit {
  KG = 'kg',
  TON = 'ton',
  HECTARE = 'ha'
}

enum Trend {
  UP = 'increasing',
  STABLE = 'stable',
  DOWN = 'decreasing'
}

// Main Interfaces
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
}

export interface IYieldForecast extends Document {
  userId: mongoose.Types.ObjectId;
  farmId: string;
  cropId: mongoose.Types.ObjectId;
  crop: {
    name: string;
    variety: string;
    plantingDate: Date;
    harvestDate: Date;
    health: string;
  };
  forecast: {
    period: ForecastPeriod;
    date: Date;
    confidence: number;
    yield: IYieldMetrics;
  };
  history: {
    previousYields: Array<{
      year: number;
      amount: number;
      unit: Unit;
    }>;
    average: number;
    trend: Trend;
  };
  factors: {
    weather: IRisk;
    soil: IRisk;
    pests: IRisk;
    diseases: IRisk;
  };
  market: {
    price: {
      current: number;
      forecast: number;
      currency: string;
    };
    demand: Trend;
    supply: Trend;
    projectedRevenue: number;
  };
  recommendations: {
    fertilizer: Array<{
      type: string;
      timing: string;
      amount: number;
    }>;
    irrigation: Array<{
      schedule: string;
      amount: number;
    }>;
    pestControl: Array<{
      type: string;
      timing: string;
    }>;
  };
  risks: {
    overall: RiskLevel;
    details: Record<string, RiskLevel>;
    mitigation: string[];
  };
  sustainability: {
    waterEfficiency: number;
    soilHealth: string;
  };
  analysis: {
    summary: string;
    confidence: number;
    recommendations: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const YieldForecastSchema = new Schema({
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
    ref: 'CropData',
    required: true
  },
  crop: {
    name: {
      type: String,
      required: true
    },
    variety: {
      type: String,
      required: true
    },
    plantingDate: {
      type: Date,
      required: true
    },
    harvestDate: {
      type: Date,
      required: true
    },
    health: String
  },
  forecast: {
    period: {
      type: String,
      enum: Object.values(ForecastPeriod),
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    yield: {
      amount: Number,
      unit: {
        type: String,
        enum: Object.values(Unit)
      },
      confidence: Number,
      perArea: Number
    }
  },
  history: {
    previousYields: [{
      year: Number,
      amount: Number,
      unit: {
        type: String,
        enum: Object.values(Unit)
      }
    }],
    average: Number,
    trend: {
      type: String,
      enum: Object.values(Trend)
    }
  },
  factors: {
    weather: {
      level: {
        type: String,
        enum: Object.values(RiskLevel)
      },
      details: String,
      mitigation: [String]
    },
    soil: {
      level: {
        type: String,
        enum: Object.values(RiskLevel)
      },
      details: String,
      mitigation: [String]
    },
    pests: {
      level: {
        type: String,
        enum: Object.values(RiskLevel)
      },
      details: String,
      mitigation: [String]
    },
    diseases: {
      level: {
        type: String,
        enum: Object.values(RiskLevel)
      },
      details: String,
      mitigation: [String]
    }
  },
  market: {
    price: {
      current: Number,
      forecast: Number,
      currency: String
    },
    demand: {
      type: String,
      enum: Object.values(Trend)
    },
    supply: {
      type: String,
      enum: Object.values(Trend)
    },
    projectedRevenue: Number
  },
  recommendations: {
    fertilizer: [{
      type: String,
      timing: String,
      amount: Number
    }],
    irrigation: [{
      schedule: String,
      amount: Number
    }],
    pestControl: [{
      type: String,
      timing: String
    }]
  },
  risks: {
    overall: {
      type: String,
      enum: Object.values(RiskLevel)
    },
    details: {
      type: Map,
      of: String
    },
    mitigation: [String]
  },
  sustainability: {
    waterEfficiency: Number,
    soilHealth: String
  },
  analysis: {
    summary: String,
    confidence: Number,
    recommendations: [String]
  }
}, {
  timestamps: true
});

// Essential Indexes
YieldForecastSchema.index({ userId: 1, farmId: 1 });
YieldForecastSchema.index({ 'crop.plantingDate': 1 });
YieldForecastSchema.index({ 'forecast.date': 1 });

// Core Methods
YieldForecastSchema.methods.getYieldTrend = function() {
  return {
    current: this.forecast.yield.amount,
    historical: this.history.average,
    trend: this.history.trend
  };
};

YieldForecastSchema.methods.getRiskSummary = function() {
  return {
    overall: this.risks.overall,
    keyFactors: Object.entries(this.risks.details)
      .filter(([_, level]) => level === RiskLevel.HIGH)
      .map(([factor]) => factor)
  };
};

export const YieldForecast = mongoose.model<IYieldForecast>(
  'YieldForecast', 
  YieldForecastSchema
);

export default YieldForecast;
