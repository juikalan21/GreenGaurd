// src/routes/userRoutes.ts
import express from 'express';
import UserController from '../controllers/UserController';
import multer from 'multer';

// Configure multer storage
const upload = multer({ dest: 'uploads/' });

// Create an Express router
const router = express.Router();

// Public routes
router.post('/register', UserController.register);
router.post('/login', UserController.login);

// Protected routes (assumes authentication middleware is applied at a higher level or here)
// For example, you could add router.use(authenticate) before these routes
router.get('/:id', UserController.getUser);
router.patch('/profile', UserController.updateProfile);
router.post('/change-password', UserController.changePassword);
router.post('/profile-picture', upload.single('file'), UserController.uploadProfilePicture);

// Farm-related routes
router.post('/farms', UserController.addFarm);
router.put('/farms/:farmId', UserController.updateFarm);
router.delete('/farms/:farmId', UserController.deleteFarm);

// Verification route
router.patch('/verify/:id', UserController.verifyUser);

export default router;