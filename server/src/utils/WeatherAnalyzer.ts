// src/utils/WeatherAnalyzer.ts
import { IWeatherData, RiskLevel } from '../models/WeatherData';

interface AgriculturalAnalysis {
  soilMoisture: {
    status: string;
    effect: string;
    managementTips: string[];
  };
  cropGrowth: {
    status: string;
    risks: string[];
    recommendations: string[];
  };
  irrigation: {
    needed: boolean;
    recommendation: string;
    schedule: string;
  };
  risks: {
    pest: RiskLevel;
    disease: RiskLevel;
    frost: boolean;
    heat: boolean;
    details: {
      pestWarning?: string;
      diseaseWarning?: string;
      extremeConditions?: string[];
    };
  };
  fieldOperations: {
    suitable: boolean;
    activities: string[];
    restrictions: string[];
  };
}

class WeatherAnalyzer {
  private static readonly THRESHOLDS = {
    temperature: {
      frost: 2,
      cold: 10,
      optimal: 25,
      hot: 30,
      extreme: 35
    },
    rainfall: {
      dry: 5,
      moderate: 15,
      heavy: 25
    },
    humidity: {
      low: 40,
      optimal: 60,
      high: 75
    },
    wind: {
      safe: 15,
      moderate: 25,
      strong: 35
    }
  };

  static analyzeWeatherForAgriculture(weatherData: IWeatherData): AgriculturalAnalysis {
    const forecast3Days = weatherData.forecast.slice(0, 3);
    const metrics = this.calculateMetrics(weatherData.current, forecast3Days);
    
    return {
      soilMoisture: this.analyzeSoilMoisture(metrics),
      cropGrowth: this.analyzeCropGrowth(metrics),
      irrigation: this.analyzeIrrigationNeeds(metrics),
      risks: this.analyzeRisks(metrics),
      fieldOperations: this.analyzeFieldOperations(metrics)
    };
  }

  private static calculateMetrics(current: any, forecast: any[]) {
    // Fixed to not rely on humidity from forecast which doesn't exist
    return {
      currentTemp: current.temperature,
      currentHumidity: current.humidity,
      currentWind: current.windSpeed,
      avgTemp: this.calculateAverage(forecast, 'dayTemp'),
      maxTemp: Math.max(...forecast.map(day => day.dayTemp)),
      minTemp: Math.min(...forecast.map(day => day.nightTemp)),
      totalRainfall: forecast.reduce((sum, day) => sum + day.rainfall, 0),
      // Using current humidity as a fallback since forecast doesn't have humidity
      avgHumidity: current.humidity,
      maxWind: Math.max(...forecast.map(day => day.windSpeed))
    };
  }

  // Added missing method
  private static determineSoilMoistureStatus(rainfall: number, avgTemp: number): 'saturated' | 'adequate' | 'at risk of drying' | 'needs monitoring' {
    if (rainfall > this.THRESHOLDS.rainfall.heavy) {
      return 'saturated';
    } else if (rainfall > this.THRESHOLDS.rainfall.moderate) {
      return 'adequate';
    } else if (avgTemp > this.THRESHOLDS.temperature.hot && rainfall < this.THRESHOLDS.rainfall.dry) {
      return 'at risk of drying';
    } else {
      return 'needs monitoring';
    }
  }

  private static determineMoistureEffect(status: 'saturated' | 'adequate' | 'at risk of drying' | 'needs monitoring'): string {
    const effects = {
      saturated: 'High risk of waterlogging and root diseases',
      adequate: 'Optimal conditions for crop growth',
      'at risk of drying': 'Potential water stress for crops',
      'needs monitoring': 'Monitor soil moisture levels closely'
    };
    return effects[status] || 'Unknown effect';
  }

  private static getMoistureTips(status: 'saturated' | 'adequate' | 'at risk of drying' | 'needs monitoring'): string[] {
    const tips = {
      saturated: ['Ensure proper drainage', 'Monitor for root diseases', 'Avoid heavy machinery'],
      adequate: ['Maintain current irrigation schedule', 'Monitor weather changes'],
      'at risk of drying': ['Increase irrigation frequency', 'Apply mulch if possible'],
      'needs monitoring': ['Check soil moisture regularly', 'Prepare irrigation systems']
    };
    return tips[status] || ['Monitor conditions regularly'];
  }

  private static determineGrowthConditions(avgTemp: number): string {
    if (avgTemp > this.THRESHOLDS.temperature.extreme) return 'heat stress';
    if (avgTemp > this.THRESHOLDS.temperature.optimal) return 'warm';
    if (avgTemp > this.THRESHOLDS.temperature.cold) return 'optimal';
    return 'cool';
  }

  private static identifyGrowthRisks(maxTemp: number, minTemp: number): string[] {
    const risks = [];
    if (maxTemp > this.THRESHOLDS.temperature.extreme) risks.push('heat damage');
    if (minTemp < this.THRESHOLDS.temperature.frost) risks.push('frost damage');
    return risks;
  }

  private static getGrowthRecommendations(risks: string[]): string[] {
    const recommendations = [];
    if (risks.includes('heat damage')) {
      recommendations.push('Provide shade if possible', 'Increase irrigation frequency');
    }
    if (risks.includes('frost damage')) {
      recommendations.push('Prepare frost protection', 'Monitor night temperatures');
    }
    return recommendations.length ? recommendations : ['Maintain regular crop care'];
  }

  private static calculateIrrigationNeed(rainfall: number, avgTemp: number): boolean {
    return rainfall < this.THRESHOLDS.rainfall.moderate && 
           avgTemp > this.THRESHOLDS.temperature.optimal;
  }

  private static getIrrigationRecommendation(needed: boolean, rainfall: number): string {
    if (!needed) return 'No irrigation needed at this time';
    if (rainfall < this.THRESHOLDS.rainfall.dry) return 'Immediate irrigation required';
    return 'Monitor and irrigate as needed';
  }

  private static generateIrrigationSchedule(needed: boolean, currentTemp: number): string {
    if (!needed) return 'Follow regular schedule';
    if (currentTemp > this.THRESHOLDS.temperature.hot) return 'Early morning or evening irrigation';
    return 'Regular daytime irrigation acceptable';
  }
  
  // Added missing method
  private static calculatePestRisk(avgTemp: number, humidity: number): RiskLevel {
    if (avgTemp > this.THRESHOLDS.temperature.hot && humidity > this.THRESHOLDS.humidity.high) {
      return RiskLevel.HIGH;
    } else if (avgTemp > this.THRESHOLDS.temperature.optimal && humidity > this.THRESHOLDS.humidity.optimal) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.LOW;
    }
  }

  // Added missing method
  private static calculateDiseaseRisk(humidity: number, rainfall: number): RiskLevel {
    if (humidity > this.THRESHOLDS.humidity.high && rainfall > this.THRESHOLDS.rainfall.moderate) {
      return RiskLevel.HIGH;
    } else if (humidity > this.THRESHOLDS.humidity.optimal || rainfall > this.THRESHOLDS.rainfall.moderate) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.LOW;
    }
  }

  private static generateRiskDetails(metrics: any) {
    const details: any = {};
    
    if (metrics.avgTemp > this.THRESHOLDS.temperature.hot) {
      details.pestWarning = 'High temperature increases pest activity';
    }
    
    if (metrics.avgHumidity > this.THRESHOLDS.humidity.high) {
      details.diseaseWarning = 'High humidity increases disease risk';
    }
    
    if (metrics.maxTemp > this.THRESHOLDS.temperature.extreme || 
        metrics.minTemp < this.THRESHOLDS.temperature.frost) {
      details.extremeConditions = ['Temperature stress likely'];
    }
    
    return details;
  }

  private static areConditionsSuitable(rainfall: number, windSpeed: number): boolean {
    return rainfall < this.THRESHOLDS.rainfall.moderate && 
           windSpeed < this.THRESHOLDS.wind.moderate;
  }

  private static getSuitableActivities(suitable: boolean, metrics: any): string[] {
    if (!suitable) return ['Limited field operations possible'];
    
    const activities = ['General field work'];
    if (metrics.totalRainfall < this.THRESHOLDS.rainfall.dry) {
      activities.push('Irrigation', 'Fertilizer application');
    }
    if (metrics.maxWind < this.THRESHOLDS.wind.safe) {
      activities.push('Spraying operations');
    }
    return activities;
  }

  private static getOperationalRestrictions(metrics: any): string[] {
    const restrictions = [];
    
    if (metrics.totalRainfall > this.THRESHOLDS.rainfall.heavy) {
      restrictions.push('Heavy machinery use restricted');
    }
    if (metrics.maxWind > this.THRESHOLDS.wind.strong) {
      restrictions.push('Spraying operations not advised');
    }
    
    return restrictions;
  }

  private static calculateAverage(data: any[], key: string): number {
    return data.reduce((sum, item) => sum + (item[key] || 0), 0) / data.length;
  }

  private static analyzeSoilMoisture(metrics: any) {
    const { totalRainfall, avgTemp } = metrics;
    
    const status = this.determineSoilMoistureStatus(totalRainfall, avgTemp);
    const effect = this.determineMoistureEffect(status);
    const managementTips = this.getMoistureTips(status);

    return { status, effect, managementTips };
  }

  private static analyzeCropGrowth(metrics: any) {
    const { avgTemp, maxTemp, minTemp } = metrics;
    
    const status = this.determineGrowthConditions(avgTemp);
    const risks = this.identifyGrowthRisks(maxTemp, minTemp);
    const recommendations = this.getGrowthRecommendations(risks);

    return { status, risks, recommendations };
  }

  private static analyzeIrrigationNeeds(metrics: any) {
    const { totalRainfall, avgTemp, currentTemp } = metrics;
    
    const needed = this.calculateIrrigationNeed(totalRainfall, avgTemp);
    const recommendation = this.getIrrigationRecommendation(needed, totalRainfall);
    const schedule = this.generateIrrigationSchedule(needed, currentTemp);

    return { needed, recommendation, schedule };
  }

  private static analyzeRisks(metrics: any) {
    const { avgTemp, avgHumidity, totalRainfall } = metrics;

    return {
      pest: this.calculatePestRisk(avgTemp, avgHumidity),
      disease: this.calculateDiseaseRisk(avgHumidity, totalRainfall),
      frost: metrics.minTemp < this.THRESHOLDS.temperature.frost,
      heat: metrics.maxTemp > this.THRESHOLDS.temperature.extreme,
      details: this.generateRiskDetails(metrics)
    };
  }

  private static analyzeFieldOperations(metrics: any) {
    const { totalRainfall, maxWind } = metrics;
    
    const suitable = this.areConditionsSuitable(totalRainfall, maxWind);
    const activities = this.getSuitableActivities(suitable, metrics);
    const restrictions = this.getOperationalRestrictions(metrics);

    return { suitable, activities, restrictions };
  }
}

export const { analyzeWeatherForAgriculture } = WeatherAnalyzer;
export default WeatherAnalyzer;