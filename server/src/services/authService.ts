// src/services/authService.ts
import { User, IUser } from '../models/User';
import {OTPPurpose, OTP,OTPType } from '../models/OTP';
import { generateToken, verifyToken } from '../utils/tokenGenerator';
import type { TokenPayload } from '../types/types';

interface RegisterInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  language?: string;
  location?: {
    state?: string;
    district?: string;
    village?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

interface AuthResponse {
  user: IUser;
  token: string;
}

class AuthService {
  /**
   * Register a new user
   */
  async register(userData: RegisterInput): Promise<{ user: IUser; otpId: string }> {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Check existing user
      const existingUser = await User.findOne({
        $or: [
          { phone: userData.phone },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      const user = await User.create([{
        ...userData,
        isVerified: false,
        role: 'farmer',
        farmDetails: []
      }], { session });

      const otp = await OTP.createNewOTP(
        user[0]._id.toString(),
        { phone: userData.phone },
        OTPPurpose.REGISTRATION,
        OTPType.SMS
      );
      await otp.save({ session });

      await session.commitTransaction();
      return { user: user[0], otpId: otp.userId.toString() };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Verify user's phone number with OTP
   */
  async verifyPhone(otpId: string, otpCode: string): Promise<AuthResponse> {
    const otp = await OTP.findById(otpId);
    if (!otp) throw new Error('Invalid OTP');

    const verified = await otp.verify(otpCode);
    if (!verified) throw new Error('Invalid OTP code');

    const user = await User.findByIdAndUpdate(
      otp.userId,
      { isVerified: true },
      { new: true }
    );
    if (!user) throw new Error('User not found');

    const token = generateToken(user._id.toString());
    return { user, token };
  }

  /**
   * Login user
   */
  async login(phone: string, password: string): Promise<AuthResponse> {
    const user = await User.findOne({ phone }).select('+password');
    if (!user) throw new Error('Invalid credentials');
    if (!user.isVerified) throw new Error('Account not verified');

    const isMatch = await user.matchPassword(password);
    if (!isMatch) throw new Error('Invalid credentials');

    user.password; 
    const token = generateToken(user._id.toString());

    return { user, token };
  }

  /**
   * Password reset
   */
  async initiatePasswordReset(phone: string): Promise<{ otpId: string }> {
    const user = await User.findOne({ phone });
    if (!user) throw new Error('User not found');

    const otp = await OTP.createNewOTP(
      user._id.toString(),
      { phone },
      OTPPurpose.RESET_PASSWORD,
      OTPType.SMS
    );
    await otp.save();

    return { otpId: otp.userId.toString() };
  }

  async resetPassword(
    otpId: string, 
    otpCode: string, 
    newPassword: string
  ): Promise<boolean> {
    const session = await User.startSession();
    session.startTransaction();

    try {
      const otp = await OTP.findById(otpId);
      if (!otp) throw new Error('Invalid OTP');

      const verified = await otp.verify(otpCode);
      if (!verified) throw new Error('Invalid OTP code');

      const user = await User.findById(otp.userId);
      if (!user) throw new Error('User not found');

      user.password = newPassword;
      await user.save({ session });

      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Token validation
   */
  async validateToken(token: string): Promise<IUser> {
    const decoded = verifyToken(token) as TokenPayload;
    const user = await User.findById(decoded.id);
    if (!user) throw new Error('User not found');
    return user;
  }

  /**
   * Utility methods
   */
  async checkPhone(phone: string): Promise<boolean> {
    const user = await User.findOne({ phone });
    return !!user;
  }

  async checkVerificationStatus(phone: string): Promise<boolean> {
    const user = await User.findOne({ phone });
    return user ? user.isVerified : false;
  }
}

export const authService = new AuthService();
export default authService;
