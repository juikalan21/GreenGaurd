// src/routes/cropRecommendationRoutes.ts
import express from 'express';
import CropRecommendationController from '../controllers/CropRecommendationController';

const router = express.Router();

// Generate new recommendations (POST with preferences and farmId)
router.post('/', CropRecommendationController.generateRecommendation);

// Get a specific recommendation by its ID
router.get('/:recommendationId', CropRecommendationController.getRecommendation);

// List the authenticated user’s crop recommendations (with pagination)
router.get('/', CropRecommendationController.getUserRecommendations);

// List crop recommendations for a specific farm (pass farmId as a URL parameter)
router.get('/farm/:farmId', CropRecommendationController.getFarmRecommendations);

// Update the preferences for a recommendation
router.patch('/:recommendationId/preferences', CropRecommendationController.updatePreferences);

// Select a recommended crop (with optional notes)
router.patch('/:recommendationId/select', CropRecommendationController.selectRecommendedCrop);

export default router;