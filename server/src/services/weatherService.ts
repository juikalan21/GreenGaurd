// src/services/weatherService.ts
import { WeatherData, IWeatherData, RiskLevel } from '../models/WeatherData';
import { User } from '../models/User';
import { getCurrentWeather, getForecastWeather } from '../config/weather';
import { analyzeWeatherForAgriculture } from '../utils/WeatherAnalyzer';

interface WeatherRecommendations {
  irrigation: string;
  pestControl: string;
  diseaseControl: string;
  fieldOperations: string;
}

interface PaginatedWeatherResponse {
  data: IWeatherData[];
  total: number;
  page: number;
  limit: number;
}

class WeatherService {
  private static readonly UPDATE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

  /**
   * Fetch and store weather data
   */
  async fetchAndStoreWeatherData(userId: string, farmId?: string): Promise<IWeatherData> {
    const user = await User.findById(userId);
    if (!user?.location?.coordinates) {
      throw new Error('User location not available');
    }

    const { latitude: lat, longitude: lng } = user.location.coordinates;
    const locationString = `${lat},${lng}`;

    try {
      // Fetch weather data
      const [current, forecast] = await Promise.all([
        getCurrentWeather(locationString),
        getForecastWeather(locationString, 7)
      ]);

      // Process weather data
      const processedData = this.processWeatherData(current, forecast, user, farmId || 'default') as IWeatherData;
      
      // Analyze agricultural impact using WeatherAnalyzer
      const analysis = analyzeWeatherForAgriculture(processedData);
      
      // Map the analysis to farmImpact structure
      const farmImpact = {
        soilMoisture: analysis.soilMoisture.status,
        cropHealth: analysis.cropGrowth.status,
        irrigationNeeded: analysis.irrigation.needed,
        risks: {
          pest: analysis.risks.pest,
          disease: analysis.risks.disease,
          frost: analysis.risks.frost,
          heat: analysis.risks.heat
        },
        yieldImpact: {
          status: analysis.cropGrowth.risks.length > 0 ? 'at risk' : 'stable',
          percentage: this.calculateYieldImpactPercentage(analysis)
        },
        recommendations: {
          immediate: analysis.cropGrowth.recommendations.slice(0, 2),
          shortTerm: [analysis.irrigation.recommendation],
          longTerm: analysis.soilMoisture.managementTips
        },
        fieldWork: {
          suitable: analysis.fieldOperations.suitable,
          activities: analysis.fieldOperations.activities
        }
      };

      const now = new Date();
      const nextUpdate = new Date(now.getTime() + WeatherService.UPDATE_INTERVAL);

      // Complete weather data object with all required fields
      const completeWeatherData: Partial<IWeatherData> = {
        ...processedData,
        farmImpact,
        lastUpdated: now,
        nextUpdate: nextUpdate
      };

      // Store weather data
      const storedWeather = await WeatherData.findOneAndUpdate(
        { userId, farmId: farmId || 'default' },
        completeWeatherData,
        { new: true, upsert: true }
      );

      return storedWeather;
    } catch (error) {
      console.error('Weather data fetch error:', error);
      throw new Error('Failed to fetch weather data');
    }
  }

  /**
   * Get latest weather data
   */
  async getLatestWeatherData(userId: string, farmId?: string): Promise<IWeatherData> {
    const weatherData = await WeatherData.findOne({ 
      userId,
      farmId: farmId || 'default'
    }).sort({ lastUpdated: -1 });

    if (!weatherData || this.isDataStale(weatherData.lastUpdated)) {
      return this.fetchAndStoreWeatherData(userId, farmId);
    }

    return weatherData;
  }

  /**
   * Get weather with recommendations
   */
  async getWeatherWithRecommendations(userId: string, farmId?: string): Promise<{
    weather: IWeatherData;
    recommendations: WeatherRecommendations;
  }> {
    const weather = await this.getLatestWeatherData(userId, farmId);
    const recommendations = this.generateRecommendations(weather);

    return { weather, recommendations };
  }

  /**
   * Get historical weather data
   */
  async getHistoricalData(
    userId: string,
    page = 1,
    limit = 10,
    farmId?: string
  ): Promise<PaginatedWeatherResponse> {
    const skip = (page - 1) * limit;
    
    const query = farmId 
      ? { userId, farmId } 
      : { userId };

    const [data, total] = await Promise.all([
      WeatherData.find(query)
        .sort({ 'current.timestamp': -1 })
        .skip(skip)
        .limit(limit),
      WeatherData.countDocuments(query)
    ]);

    return { data, total, page, limit };
  }

  private processWeatherData(current: any, forecast: any, user: any, farmId: string): Partial<IWeatherData> {
    // Create alerts from weather warnings if any
    const alerts = [];
    if (current.current.precip_mm > 25) {
      alerts.push({
        type: 'Heavy Rainfall',
        severity: RiskLevel.MEDIUM,
        description: 'Heavy rainfall may cause waterlogging',
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours later
      });
    }

    return {
      userId: user._id,
      farmId,
      location: {
        name: user.location?.village || current.location.name,
        state: user.location?.state || current.location.region,
        coordinates: user.location.coordinates,
        elevation: user.location?.elevation || 0
      },
      current: {
        timestamp: new Date(),
        temperature: current.current.temp_c,
        humidity: current.current.humidity,
        windSpeed: current.current.wind_kph,
        rainfall: current.current.precip_mm,
        condition: current.current.condition.text,
        uvIndex: current.current.uv,
        pressure: current.current.pressure_mb,
        visibility: current.current.vis_km
      },
      forecast: forecast.forecast.forecastday.map(this.processForecastDay),
      alerts
    };
  }

  private processForecastDay(day: any) {
    // Map forecast data to match the expected schema
    return {
      date: new Date(day.date),
      dayTemp: day.day.maxtemp_c,
      nightTemp: day.day.mintemp_c,
      rainfall: day.day.totalprecip_mm,
      windSpeed: day.day.maxwind_kph,
      condition: day.day.condition.text,
      hourly: day.hour?.map((hour:any) => ({
        time: hour.time.split(' ')[1], // Extract only the time part
        temp: hour.temp_c,
        rainfall: hour.precip_mm,
        condition: hour.condition.text
      })) || []
    };
  }

  private generateRecommendations(weather: IWeatherData): WeatherRecommendations {
    // Using the farmImpact data which is properly structured
    return {
      irrigation: this.getIrrigationRecommendation(weather),
      pestControl: this.getPestControlRecommendation(weather.farmImpact.risks.pest),
      diseaseControl: this.getDiseaseControlRecommendation(weather.farmImpact.risks.disease),
      fieldOperations: this.getFieldOperationsRecommendation(weather)
    };
  }

  private getIrrigationRecommendation(weather: IWeatherData): string {
    // Check if irrigation is needed based on farmImpact data
    if (weather.farmImpact.irrigationNeeded) {
      return weather.farmImpact.recommendations.immediate.find(rec => 
        rec.toLowerCase().includes('irrigat')) || 'Irrigation recommended';
    }
    
    const precipExpected = weather.forecast.some(day => day.rainfall > 5);
    return precipExpected 
      ? 'Hold irrigation due to expected rainfall'
      : 'Regular irrigation schedule can be maintained';
  }

  private getPestControlRecommendation(risk: RiskLevel): string {
    // Map risk levels to recommendations
    const recommendations = {
      [RiskLevel.HIGH]: 'Immediate preventive measures needed',
      [RiskLevel.MEDIUM]: 'Monitor and prepare control measures',
      [RiskLevel.LOW]: 'Regular monitoring sufficient',
      [RiskLevel.CRITICAL]: 'Urgent pest control intervention required'
    };
    return recommendations[risk] || recommendations[RiskLevel.LOW];
  }

  private getDiseaseControlRecommendation(risk: RiskLevel): string {
    // Map risk levels to recommendations
    const recommendations = {
      [RiskLevel.HIGH]: 'Apply preventive fungicide treatment',
      [RiskLevel.MEDIUM]: 'Monitor susceptible crops closely',
      [RiskLevel.LOW]: 'Standard monitoring adequate',
      [RiskLevel.CRITICAL]: 'Urgent disease management required'
    };
    return recommendations[risk] || recommendations[RiskLevel.LOW];
  }

  private getFieldOperationsRecommendation(weather: IWeatherData): string {
    // Check if field operations are suitable based on farmImpact data
    if (!weather.farmImpact.fieldWork.suitable) {
      return 'Field operations not recommended at this time';
    }
    
    const nextThreeDays = weather.forecast.slice(0, 3);
    const willRain = nextThreeDays.some(day => day.rainfall > 5);
    
    if (willRain) {
      return 'Plan field operations around expected rainfall';
    }
    
    return `Favorable conditions for: ${weather.farmImpact.fieldWork.activities.join(', ')}`;
  }

  private calculateYieldImpactPercentage(analysis: any): number {
    // Simple algorithm to estimate yield impact percentage
    let impact = 0;
    
    // Negative factors
    if (analysis.risks.pest === RiskLevel.HIGH) impact -= 15;
    if (analysis.risks.pest === RiskLevel.MEDIUM) impact -= 7;
    
    if (analysis.risks.disease === RiskLevel.HIGH) impact -= 20;
    if (analysis.risks.disease === RiskLevel.MEDIUM) impact -= 10;
    
    if (analysis.risks.frost) impact -= 25;
    if (analysis.risks.heat) impact -= 18;
    
    // Positive factors
    if (analysis.soilMoisture.status === 'adequate') impact += 10;
    if (analysis.irrigation.needed === false) impact += 5;
    
    // Limit to reasonable range
    return Math.max(Math.min(impact, 50), -50);
  }

  private isDataStale(lastUpdate: Date): boolean {
    return Date.now() - lastUpdate.getTime() > WeatherService.UPDATE_INTERVAL;
  }
}

export const weatherService = new WeatherService();
export default weatherService;