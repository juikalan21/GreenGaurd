import { Storage } from '@google-cloud/storage';
import { env } from './env';

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: env.GOOGLE_CLOUD_PROJECT_ID,
});

// Get the storage bucket
const bucket = storage.bucket(env.GOOGLE_CLOUD_STORAGE_BUCKET);

// Helper function to upload a file to Google Cloud Storage
export const uploadFile = async (
  file: Express.Multer.File,
  folderPath: string
): Promise<string> => {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `${folderPath}/${timestamp}-${file.originalname.replace(/\s+/g, '_')}`;
    
    // Create a new blob in the bucket
    const blob = bucket.file(fileName);
    
    // Create a write stream for the file
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });
    
    // Return a promise that resolves with the public URL when upload completes
    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        reject(`Error uploading file: ${error.message}`);
      });
      
      blobStream.on('finish', async () => {
        // Make the file public
        await blob.makePublic();
        
        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${env.GOOGLE_CLOUD_STORAGE_BUCKET}/${fileName}`;
        resolve(publicUrl);
      });
      
      // End the stream with the file buffer
      blobStream.end(file.buffer);
    });
  } catch (error) {
    console.error(`Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

// Simple function to delete a file
export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    const urlParts = fileUrl.split(`${env.GOOGLE_CLOUD_STORAGE_BUCKET}/`);
    if (urlParts.length < 2) throw new Error('Invalid file URL');
    
    const filePath = urlParts[1];
    await bucket.file(filePath).delete();
  } catch (error) {
    console.error(`Delete error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default { uploadFile, deleteFile, bucket };
