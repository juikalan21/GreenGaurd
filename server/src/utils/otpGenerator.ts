import { nanoid } from 'nanoid';
import { OTP, IOTP } from '../models/OTP';
import { smsService } from '../services/smsService';
//import logger from '../config/logger';

/**
 * Generate a new OTP and send it via SMS
 */
export const generateAndSendOTP = async (
  userId: string,
  phone: string,
  purpose: 'registration' | 'login' | 'reset_password' | 'verification'
): Promise<{ success: boolean; otpId?: string }> => {
  try {
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create OTP record
    const otpId = nanoid();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP valid for 10 minutes
    
    await OTP.create({
      _id: otpId,
      userId,
      phone,
      otp: otpCode,
      purpose,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });
    
    // Send OTP via SMS
    const smsSent = await smsService.sendOtpSms(phone, otpCode);
    
    if (!smsSent) {
      
      return { success: false };
    }
    
   
    return { success: true, otpId };
  } catch (error) {
    
    return { success: false };
  }
};

/**
 * Verify an OTP
 */
export const verifyOTP = async (
  otpId: string,
  otpCode: string
): Promise<{ verified: boolean; userId?: string }> => {
  try {
    // Find OTP record
    const otpRecord = await OTP.findById(otpId) as IOTP | null;
    
    if (!otpRecord) {
      
      return { verified: false };
    }
    
    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      
      return { verified: false };
    }
    
    // Check if OTP is already used
    if (otpRecord.isUsed) {
      
      return { verified: false };
    }
    
    // Increment attempts
    otpRecord.attempts += 1;
    
    // Check if max attempts reached
    if (otpRecord.attempts > 3) {
      
      await otpRecord.save();
      return { verified: false };
    }
    
    // Verify OTP
    if (otpRecord.otp !== otpCode) {
     
      await otpRecord.save();
      return { verified: false };
    }
    
    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
    
    
    return { verified: true, userId: otpRecord.userId };
  } catch (error) {
    
    return { verified: false };
  }
};

export default { generateAndSendOTP, verifyOTP };