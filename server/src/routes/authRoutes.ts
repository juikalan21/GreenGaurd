// src/routes/authRoutes.ts
import express from 'express';
import AuthController from '../controllers/AuthController';

const router = express.Router();

// Endpoint to register a new user
router.post('/register', AuthController.register);

// Endpoint to verify phone using OTP
router.post('/verify-phone', AuthController.verifyPhone);

// Endpoint to log in the user
router.post('/login', AuthController.login);

// Endpoint to initiate a password reset (sends OTP)
router.post('/initiate-reset', AuthController.initiatePasswordReset);

// Endpoint to reset the password using OTP
router.post('/reset-password', AuthController.resetPassword);

// Endpoint to validate an authentication token
router.get('/validate-token', AuthController.validateToken);

export default router;