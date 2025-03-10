// src/utils/imageProcessor.ts
import sharp from 'sharp';
import { uploadFile } from '../config/storage';

interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

interface ProcessedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

class ImageProcessor {
  private static readonly DEFAULT_OPTIONS: ImageProcessingOptions = {
    width: 800,
    quality: 80,
    format: 'jpeg',
    fit: 'inside'
  };

  /**
   * Process and upload an image
   */
  static async processAndUploadImage(
    file: Express.Multer.File,
    folderPath: string,
    options: ImageProcessingOptions = {}
  ): Promise<string> {
    try {
      const processedImage = await this.processImage(file, options);
      
      const uploadableFile = {
        ...file,
        buffer: processedImage.buffer,
        mimetype: `image/${processedImage.format}`,
        size: processedImage.size
      };

      return await uploadFile(uploadableFile, folderPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Image processing failed: ${errorMessage}`);
    }
  }

  /**
   * Process image with sharp
   */
  static async processImage(
    file: Express.Multer.File,
    customOptions: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    const options = { ...this.DEFAULT_OPTIONS, ...customOptions };
    
    try {
      let processor = sharp(file.buffer);

      // Apply resizing
      if (options.width || options.height) {
        processor = processor.resize(options.width, options.height, {
          fit: options.fit,
          withoutEnlargement: true
        });
      }

      // Apply format-specific processing
      switch (options.format) {
        case 'jpeg':
          processor = processor.jpeg({ quality: options.quality });
          break;
        case 'png':
          processor = processor.png({ quality: options.quality });
          break;
        case 'webp':
          processor = processor.webp({ quality: options.quality });
          break;
      }

      const { data, info } = await processor.toBuffer({ resolveWithObject: true });

      return {
        buffer: data,
        format: options.format || 'jpeg',
        width: info.width,
        height: info.height,
        size: info.size
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Image processing failed: ${errorMessage}`);
    }
  }

  /**
   * Convert image to base64
   */
  static imageToBase64(file: Express.Multer.File): string {
    try {
      return file.buffer.toString('base64');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Base64 conversion failed: ${errorMessage}`);
    }
  }

  /**
   * Generate image thumbnail
   */
  static async generateThumbnail(
    file: Express.Multer.File,
    width: number = 200
  ): Promise<Buffer> {
    try {
      return await sharp(file.buffer)
        .resize(width, null, { fit: 'inside' })
        .jpeg({ quality: 60 })
        .toBuffer();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Thumbnail generation failed: ${errorMessage}`);
    }
  }

  /**
   * Extract image metadata
   */
  static async getImageMetadata(file: Express.Multer.File) {
    try {
      return await sharp(file.buffer).metadata();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Metadata extraction failed: ${errorMessage}`);
    }
  }
}

export const { 
  processAndUploadImage,
  processImage,
  imageToBase64,
  generateThumbnail,
  getImageMetadata
} = ImageProcessor;

export default ImageProcessor;
