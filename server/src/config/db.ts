import mongoose from 'mongoose';
import { env } from './env';


// Connect to MongoDB
export const connectDB = async (): Promise<void> => {
  try {
    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }
    await mongoose.connect(env.MONGODB_URI);
    console.log(`MongoDB Connected`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
};

export default { connectDB };
