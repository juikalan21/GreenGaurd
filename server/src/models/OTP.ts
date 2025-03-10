import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

// Enums
export enum OTPPurpose {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  RESET_PASSWORD = 'reset_password',
  VERIFICATION = 'verification',
  PAYMENT = 'payment'
}

export enum OTPType {
  SMS = 'sms',
  EMAIL = 'email',
  AUTHENTICATOR = 'authenticator'
}

enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed'
}

// Interfaces
interface IDeviceInfo {
  deviceId: string;
  browser: string;
  platform: string;
  ip: string;
}

export interface IOTP extends Document {
  userId: string;
  phone?: string;
  email?: string;
  otp: string;
  hash: string;
  purpose: OTPPurpose;
  type: OTPType;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  maxAttempts: number;
  blocked: boolean;
  blockedUntil?: Date;
  deviceInfo?: IDeviceInfo;
  verificationStatus: VerificationStatus;
  lastAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  isExpired(): boolean;
  isBlocked(): boolean;
  incrementAttempts(): Promise<void>;
  verify(inputOTP: string): Promise<boolean>;
}

interface OTPModel extends mongoose.Model<IOTP> {
  generateOTP(length?: number): string;
  hashOTP(otp: string): string;
  createNewOTP(
    userId: string,
    contact: { phone?: string; email?: string },
    purpose: OTPPurpose,
    type: OTPType,
    deviceInfo?: IDeviceInfo
  ): Promise<IOTP>;
}

const OTPSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  phone: {
    type: String,
    validate: {
      validator: (v: string) => /^\+[1-9]\d{1,14}$/.test(v),
      message: 'Invalid phone number'
    }
  },
  email: {
    type: String,
    validate: {
      validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: 'Invalid email'
    }
  },
  otp: {
    type: String,
    required: true,
    select: false
  },
  hash: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: Object.values(OTPPurpose),
    required: true
  },
  type: {
    type: String,
    enum: Object.values(OTPType),
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  blocked: {
    type: Boolean,
    default: false
  },
  blockedUntil: Date,
  deviceInfo: {
    deviceId: String,
    browser: String,
    platform: String,
    ip: String
  },
  verificationStatus: {
    type: String,
    enum: Object.values(VerificationStatus),
    default: VerificationStatus.PENDING
  },
  lastAttemptAt: Date
}, {
  timestamps: true
});

// Indexes
OTPSchema.index({ userId: 1, purpose: 1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OTPSchema.index({ phone: 1, createdAt: -1 });
OTPSchema.index({ email: 1, createdAt: -1 });

// Instance Methods
OTPSchema.methods = {
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  },

  isBlocked(): boolean {
    return this.blocked && (!this.blockedUntil || new Date() < this.blockedUntil);
  },

  async incrementAttempts(): Promise<void> {
    this.attempts += 1;
    this.lastAttemptAt = new Date();
    
    if (this.attempts >= this.maxAttempts) {
      this.blocked = true;
      this.blockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
    
    await this.save();
  },

  async verify(inputOTP: string): Promise<boolean> {
    if (this.isExpired()) throw new Error('OTP expired');
    if (this.isBlocked()) throw new Error('Too many attempts');
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(this.hash),
      Buffer.from(OTP.hashOTP(inputOTP))
    );
    
    if (!isValid) {
      await this.incrementAttempts();
      return false;
    }
    
    this.isUsed = true;
    this.verificationStatus = VerificationStatus.VERIFIED;
    await this.save();
    
    return true;
  }
};

// Static Methods
OTPSchema.statics = {
  generateOTP(length: number = 6): string {
    return crypto.randomInt(100000, 999999).toString();
  },

  hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  },

  async createNewOTP(
    userId: string,
    contact: { phone?: string; email?: string },
    purpose: OTPPurpose,
    type: OTPType,
    deviceInfo?: IDeviceInfo
  ): Promise<IOTP> {
    const otp = (this as OTPModel).generateOTP();
    
    return new this({
      userId,
      ...contact,
      otp,
      hash: (this as OTPModel).hashOTP(otp),
      purpose,
      type,
      deviceInfo,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
  }
};

// Middleware
OTPSchema.pre('save', function(next) {
  if (this.isModified('otp')) {
    this.hash = OTP.hashOTP(this.otp);
  }
  next();
});

export const OTP = mongoose.model<IOTP, OTPModel>('OTP', OTPSchema);
export default OTP;
