// src/routes/soilAnalysisRoutes.ts
import express from 'express';
import SoilAnalysisController from '../controllers/SoilAnalysisController';

const router = express.Router();

// Create a new soil analysis record
router.post('/', SoilAnalysisController.createAnalysis);

// Upload image and trigger AI analysis for an existing soil analysis
router.post('/:analysisId/image', SoilAnalysisController.uploadAndAnalyze);

// Get details of a particular soil analysis
router.get('/:analysisId', SoilAnalysisController.getAnalysis);

// Get paginated soil analyses for a given farm
router.get('/farm/:farmId', SoilAnalysisController.getFarmAnalyses);

// Update the notes in a soil analysis record
router.patch('/:analysisId/notes', SoilAnalysisController.updateNotes);

export default router;