// src/services/smsService.ts
import axios from 'axios';
import { env } from '../config/env';
import { info } from 'console';

/**
 * Service for sending SMS messages, particularly OTPs
 */
export const smsService = {
  /**
   * Send OTP via SMS
   * @param phone Phone number to send OTP to
   * @param otp The OTP code to send
   * @returns Promise<boolean> Success status
   */
  async sendOtpSms(phone: string, otp: string): Promise<boolean> {
    try {
      // For hackathon purposes, we'll use console.log instead of a real SMS gateway
      // In a production environment, you would integrate with an SMS provider API
      
      
      info(`[SMS SERVICE] Sending OTP:${otp} SMS to phone: ${phone}`);
      // Mock implementation for development/hackathon
      if (env.NODE_ENV === 'production') {
        // In production, we would use a real SMS gateway
        // Example implementation with a generic SMS API
        /*
        const response = await axios.post(env.SMS_API_URL, {
          apiKey: env.SMS_API_KEY,
          phone: phone,
          message: `Your AgroTech verification code is: ${otp}. Valid for 10 minutes.`
        });
        
        return response.status === 200;
        */
        
        // Simulate success for hackathon demo
        return true;
      } else {
        // For development, just log the OTP
        console.log(`🔐 [DEVELOPMENT OTP] Phone: ${phone}, OTP: ${otp}`);
        return true;
      }
    } catch (error) {
      Error(`Send OTP SMS error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  },
  
  /**
   * Send a general SMS notification
   * @param phone Phone number to send SMS to
   * @param message Message content
   * @returns Promise<boolean> Success status
   */
  async sendNotificationSms(phone: string, message: string): Promise<boolean> {
    try {
      info(`[SMS SERVICE] Sending notification SMS to phone: ${phone}`);
      
      // Mock implementation for development/hackathon
      if (env.NODE_ENV === 'production') {
        // Similar implementation as above for production
        return true;
      } else {
        // For development, just log the message
        console.log(`📱 [DEVELOPMENT SMS] Phone: ${phone}, Message: ${message}`);
        return true;
      }
    } catch (error) {
      Error(`Send notification SMS error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
};

export default smsService;