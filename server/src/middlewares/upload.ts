import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Simple upload middleware
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Export upload configurations
export const uploadSoilImage = upload.single('soilImage');
export const uploadCropImage = upload.single('cropImage');
export const uploadProfileImage = upload.single('profileImage');

export default {
  uploadSoilImage,
  uploadCropImage,
  uploadProfileImage
};
