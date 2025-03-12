// src/routes/weatherRoutes.ts
import express from 'express';
import WeatherController from '../controllers/WeatherController';

const router = express.Router();

// POST route to trigger weather data fetch and store
router.post('/fetch', WeatherController.fetchWeather);

// GET route to retrieve the latest weather data
router.get('/current', WeatherController.getLatestWeather);

// GET route to retrieve weather data along with recommendations
router.get('/recommendations', WeatherController.getWeatherRecommendations);

// GET route to retrieve historical weather data with pagination
router.get('/history', WeatherController.getHistoricalWeather);

export default router;