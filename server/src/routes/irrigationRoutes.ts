// src/routes/irrigationRoutes.ts
import express from 'express';
import IrrigationController from '../controllers/IrrigationController';

const router = express.Router();

// Generate a new irrigation schedule
router.post('/', IrrigationController.generateSchedule);

// Get irrigation schedules for the authenticated user (with pagination)
router.get('/user', IrrigationController.getUserSchedules);

// Get irrigation schedules for a specific farm
router.get('/farm/:farmId', IrrigationController.getFarmSchedules);

// Get irrigation schedules for a specific crop
router.get('/crop/:cropDataId', IrrigationController.getCropSchedules);

// Update irrigation schedule status for a given date
router.patch('/:scheduleId/status', IrrigationController.updateStatus);

// Add a sensor reading to an irrigation schedule
router.post('/:scheduleId/sensor-reading', IrrigationController.addSensorReading);

// Toggle irrigation automation status
router.patch('/:scheduleId/automation', IrrigationController.toggleAutomation);

// Update water quality information
router.patch('/:scheduleId/water-quality', IrrigationController.updateWaterQuality);

// Add fertigation entry to an irrigation schedule
router.post('/:scheduleId/fertigation', IrrigationController.addFertigation);

export default router;