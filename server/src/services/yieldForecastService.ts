import { YieldForecast, IYieldForecast, ForecastPeriod, RiskLevel, Unit, Trend } from '../models/YieldForecast';
import { User } from '../models/User';
import { CropData } from '../models/CropData';
import { SoilAnalysis } from '../models/SoilAnalysis';
import { WeatherData } from '../models/WeatherData';
import { aiService } from './aiService';
//import { notificationService } from './notificationService';

export const yieldForecastService = {
  async generateForecast(
    userId: string,
    farmId: string,
    cropId: string
  ): Promise<IYieldForecast> {
    const [user, cropData, soilAnalysis, weatherData] = await Promise.all([
      User.findById(userId),
      CropData.findById(cropId),
      SoilAnalysis.findOne({ farmId }).sort({ createdAt: -1 }),
      WeatherData.findOne({ farmId }).sort({ createdAt: -1 })
    ]);

    if (!user || !cropData || !soilAnalysis || !weatherData) {
      throw new Error('Required data not found');
    }

    const aiResult = await aiService.generateYieldForecast(
      cropData,
      soilAnalysis,
      weatherData,
      { historicalYields: [] } // Replace with actual historical data if available
    );

    const forecast = await YieldForecast.create({
      userId,
      farmId,
      cropId,
      crop: {
        name: cropData.cropName,
        variety: cropData.cropType,
        plantingDate: cropData.plantingDate,
        harvestDate: cropData.expectedHarvestDate,
        health: cropData.healthStatus
      },
      forecast: {
        period: ForecastPeriod.MEDIUM,
        date: new Date(),
        confidence: aiResult.confidence,
        yield: {
          amount: aiResult.estimatedYield,
          unit: Unit.KG,
          confidence: aiResult.yieldConfidence,
          perArea: aiResult.yieldPerHectare
        }
      },
      history: {
        previousYields: aiResult.historicalYields,
        average: aiResult.averageYield,
        trend: calculateTrend(aiResult.historicalYields)
      },
      factors: {
        weather: {
          level: aiResult.weatherRisk as RiskLevel,
          details: aiResult.weatherAnalysis,
          mitigation: aiResult.weatherMitigation
        },
        soil: {
          level: aiResult.soilRisk as RiskLevel,
          details: aiResult.soilAnalysis,
          mitigation: aiResult.soilMitigation
        },
        pests: {
          level: aiResult.pestRisk as RiskLevel,
          details: aiResult.pestAnalysis,
          mitigation: aiResult.pestMitigation
        },
        diseases: {
          level: aiResult.diseaseRisk as RiskLevel,
          details: aiResult.diseaseAnalysis,
          mitigation: aiResult.diseaseMitigation
        }
      },
      market: {
        price: {
          current: aiResult.currentPrice,
          forecast: aiResult.forecastPrice,
          currency: 'INR'
        },
        demand: aiResult.demandTrend as Trend,
        supply: aiResult.supplyTrend as Trend,
        projectedRevenue: aiResult.projectedRevenue
      },
      recommendations: {
        fertilizer: aiResult.fertilizerRecommendations,
        irrigation: aiResult.irrigationSchedule,
        pestControl: aiResult.pestControlMeasures
      },
      risks: {
        overall: aiResult.overallRisk as RiskLevel,
        details: aiResult.riskFactors,
        mitigation: aiResult.riskMitigation
      },
      sustainability: {
        waterEfficiency: aiResult.waterEfficiency,
        soilHealth: aiResult.soilHealthStatus
      },
      analysis: {
        summary: aiResult.summary,
        confidence: aiResult.overallConfidence,
        recommendations: aiResult.keyRecommendations
      }
    });

    //await this.notifyUser(forecast);
    return forecast;
  },

  async getForecast(id: string, userId: string): Promise<IYieldForecast> {
    const forecast = await YieldForecast.findById(id);
    if (!forecast || forecast.userId.toString() !== userId) {
      throw new Error('Forecast not found');
    }
    return forecast;
  },

  async getForecasts(query: { 
    userId: string; 
    farmId?: string;
    cropId?: string;
  }, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [forecasts, total] = await Promise.all([
      YieldForecast.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      YieldForecast.countDocuments(query)
    ]);

    return { forecasts, total, page, limit };
  },

  async getTrends(farmId: string, cropId: string) {
    const forecasts = await YieldForecast.find({ farmId, cropId })
      .sort({ 'forecast.date': -1 })
      .limit(5);

    return forecasts.map(f => f.getYieldTrend());
  },
  };
  // async getRiskAssessment(id: string): Promise<any> {
  //   const forecast = await YieldForecast.findById(id);
  //   if (!forecast) throw new Error('Forecast not found');
  //   return forecast.getRiskSummary();
  // },

  // private async notifyUser(forecast: IYieldForecast) {
  //   await notificationService.createNotification({
  //     userId: forecast.userId.toString(),
  //     title: `Yield Forecast: ${forecast.crop.name}`,
  //     message: `New yield forecast available. Estimated yield: ${forecast.forecast.yield.amount} ${forecast.forecast.yield.unit}`,
  //     type: 'info',
  //     priority: 'medium',
  //     actionRequired: false
  //   });
  // },

function calculateTrend(yields: Array<{ amount: number }>): Trend {
  if (yields.length < 2) return Trend.STABLE;
  const latest = yields[0].amount;
  const previous = yields[1].amount;
  if (latest > previous * 1.05) return Trend.UP;
  if (latest < previous * 0.95) return Trend.DOWN;
  return Trend.STABLE;
}

export default yieldForecastService;
