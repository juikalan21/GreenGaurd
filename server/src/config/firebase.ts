import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { env } from './env';
import logger from './logger';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
};

// Initialize Firebase
let firebaseApp;
let auth;

try {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  logger.info('Firebase initialized successfully');
} catch (error) {
  if (error instanceof Error) {
    logger.error(`Error initializing Firebase: ${error.message}`);
  } else {
    logger.error('Unknown error initializing Firebase');
  }
}

export { firebaseApp, auth };