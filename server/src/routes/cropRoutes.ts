// src/routes/cropRoutes.ts
import express from 'express';
import CropController from '../controllers/CropController';

const router = express.Router();

// Create a new crop
router.post('/', CropController.createCrop);

// Upload and analyze crop image
router.post('/:cropId/image', CropController.uploadAndAnalyzeImage);

// Update growth metrics of a specific crop
router.patch('/:cropId/growth', CropController.updateGrowthMetrics);

// Update weather impact data for a crop
router.patch('/:cropId/weather-impact', CropController.updateWeatherImpact);

// Update harvest plan for a crop
router.patch('/:cropId/harvest-plan', CropController.updateHarvestPlan);

// Get details for a specific crop
router.get('/:cropId', CropController.getCrop);

// Get all crops for a specific farm
router.get('/farm/:farmId', CropController.getFarmCrops);

// Get crops that need attention (e.g. poor health, overdue for inspection)
router.get('/attention', CropController.getCropsNeedingAttention);

export default router;