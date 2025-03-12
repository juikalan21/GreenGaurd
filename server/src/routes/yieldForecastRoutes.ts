// src/routes/yieldForecastRoutes.ts
import express from 'express';
import YieldForecastController from '../controllers/YieldForecastController';

const router = express.Router();

// Route to generate a new yield forecast
router.post('/', YieldForecastController.generateForecast);

// Route to get yield trends based on farmId and cropId (ensure this route is defined before '/:id' to avoid conflicts)
router.get('/trends', YieldForecastController.getTrends);

// Route to get a list of forecasts with optional pagination/filters
router.get('/', YieldForecastController.getForecasts);

// Route to get a specific yield forecast by ID
router.get('/:id', YieldForecastController.getForecast);

export default router;