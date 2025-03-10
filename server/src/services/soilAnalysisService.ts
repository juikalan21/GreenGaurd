// src/services/soilAnalysisService.ts
import { SoilAnalysis, ISoilAnalysis, UnitType, SoilType } from '../models/SoilAnalysis';
import { User } from '../models/User';
import { processAndUploadImage } from '../utils/imageProcessor';
import { analyzeImageWithAI } from './aiService';

interface CreateSoilAnalysisInput {
  sampleId: string;
  location: {
    coordinates: number[];
    sampleDepth: number;
  };
  samplingDate: Date;
  notes?: string;
}

interface AnalysisResults {
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
}

interface PaginatedResponse {
  data: ISoilAnalysis[];
  total: number;
  page: number;
  limit: number;
}

class SoilAnalysisService {
  async createAnalysis(
    userId: string,
    farmId: string,
    data: CreateSoilAnalysisInput
  ): Promise<ISoilAnalysis> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const farm = user.farmDetails.find((farm:any) => farm._id.toString() === farmId);
    if (!farm) throw new Error('Farm not found');

    // Set next analysis date to 6 months from sampling
    const nextAnalysisDate = new Date(data.samplingDate);
    nextAnalysisDate.setMonth(nextAnalysisDate.getMonth() + 6);

    const analysis = await SoilAnalysis.create({
      userId,
      farmId,
      ...data,
      nextAnalysisDate,
      results: {
        nutrients: {
          nitrogen: 0,
          phosphorus: 0,
          potassium: 0,
          units: UnitType.PPM
        },
        ph: 0,
        salinity: 0,
        moisture: 0,
        organicMatter: 0,
        texture: SoilType.LOAM
      },
      recommendations: {
        fertilizers: [],
        amendments: [],
        practices: []
      },
      analysis: {
        summary: '',
        issues: [],
        improvements: []
      }
    });

    return analysis;
  }

  async uploadAndAnalyze(
    analysisId: string,
    file: Express.Multer.File
  ): Promise<ISoilAnalysis> {
    const analysis = await SoilAnalysis.findById(analysisId);
    if (!analysis) throw new Error('Analysis not found');

    // Process and upload image
    const imageUrl = await processAndUploadImage(
      file,
      `soil-analysis/${analysis.userId}`,
      { width: 800, quality: 80 }
    );

    // Get analysis context
    const user = await User.findById(analysis.userId);
    if (!user) throw new Error('User not found');

    const farm = user.farmDetails.find((f:any) => f._id.toString() === analysis.farmId);
    if (!farm) throw new Error('Farm not found');

    // Analyze with AI
    const aiResults = await analyzeImageWithAI(imageUrl, 'soil_analysis', {
      farmLocation: user.location,
      soilType: farm.soilType,
      sampleDepth: analysis.location.sampleDepth,
      currentCrops: farm.currentCrops
    });

    // Update analysis with results
    analysis.results = this.processAIResults(aiResults);
    analysis.recommendations = aiResults.recommendations;
    analysis.analysis = {
      summary: aiResults.summary,
      issues: aiResults.issues,
      improvements: aiResults.improvements
    };

    await analysis.save();
    return analysis;
  }

  async getAnalysis(analysisId: string, userId: string): Promise<ISoilAnalysis> {
    const analysis = await SoilAnalysis.findOne({ _id: analysisId, userId });
    if (!analysis) throw new Error('Analysis not found');
    return analysis;
  }

  async getFarmAnalyses(
    farmId: string,
    userId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse> {
    const skip = (page - 1) * limit;

    const [analyses, total] = await Promise.all([
      SoilAnalysis.find({ farmId, userId })
        .sort({ samplingDate: -1 })
        .skip(skip)
        .limit(limit),
      SoilAnalysis.countDocuments({ farmId, userId })
    ]);

    return {
      data: analyses,
      total,
      page,
      limit
    };
  }

  async updateNotes(
    analysisId: string,
    userId: string,
    notes: string
  ): Promise<ISoilAnalysis> {
    const analysis = await SoilAnalysis.findOneAndUpdate(
      { _id: analysisId, userId },
      { notes },
      { new: true }
    );
    if (!analysis) throw new Error('Analysis not found');
    return analysis;
  }

  private processAIResults(aiResults: any): AnalysisResults {
    return {
      nutrients: {
        nitrogen: aiResults.nutrients.nitrogen || 0,
        phosphorus: aiResults.nutrients.phosphorus || 0,
        potassium: aiResults.nutrients.potassium || 0,
        other: aiResults.nutrients.other,
        units: aiResults.nutrients.units || UnitType.PPM
      },
      ph: aiResults.ph || 0,
      salinity: aiResults.salinity || 0,
      moisture: aiResults.moisture || 0,
      organicMatter: aiResults.organicMatter || 0,
      texture: aiResults.texture || SoilType.LOAM
    };
  }
}

export const soilAnalysisService = new SoilAnalysisService();
export default soilAnalysisService;
