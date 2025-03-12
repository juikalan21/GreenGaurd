// src/routes/pestDiseaseRoutes.ts
import express from 'express';
import PestDiseaseController from '../controllers/PestDiseaseController';

const router = express.Router();

// Route for AI-based pest/disease detection
router.post('/detect/ai', PestDiseaseController.detectWithAI);

// Route for manual pest/disease detection
router.post('/detect/manual', PestDiseaseController.addManualDetection);

// Get details of a specific detection
router.get('/:detectionId', PestDiseaseController.getDetection);

// List all detections for a specific farm
router.get('/farm/:farmId', PestDiseaseController.getFarmDetections);

// List all detections for a specific crop
router.get('/crop/:cropId', PestDiseaseController.getCropDetections);

// Record treatment details for a detection
router.patch('/:detectionId/treatment', PestDiseaseController.recordTreatment);

// Mark a detection as resolved
router.patch('/:detectionId/resolve', PestDiseaseController.resolveDetection);

// Generate a treatment plan for a detection
router.post('/:detectionId/treatment-plan', PestDiseaseController.generateTreatmentPlan);

export default router;