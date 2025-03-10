import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Core Interfaces
interface ILocation {
  state?: string;
  district?: string;
  village?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface IFarm {
  _id: string;
  name: string;
  size: number;
  sizeUnit: 'acres' | 'hectares';
  soilType?: string;
  crops?: string[];
  location?: ILocation;
  createdAt: Date;
}


export interface IUser extends Document {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  password: string;
  language: string;
  profilePicture?: string;
  location: ILocation;
  farms: IFarm[];
  isVerified: boolean;
  role: 'farmer' | 'admin' | 'expert';
  createdAt: Date;
  updatedAt: Date;
  farmDetails: Array<{
    _id: string;
    soilType: string;
    currentCrops: string[];
  }>;
  
  matchPassword(password: string): Promise<boolean>;
}

// Schema Definition
const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name too short'],
    maxlength: [50, 'Name too long']
  },
  phone: {
    type: String,
    required: [true, 'Phone number required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Invalid phone number']
  },
  email: {
    type: String,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: [true, 'Password required'],
    minlength: [6, 'Password too short'],
    select: false
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'ta', 'te', 'ml', 'kn', 'pa', 'bn', 'gu', 'mr', 'or', 'as'],
    default: 'en'
  },
  profilePicture: String,
  location: {
    state: String,
    district: String,
    village: String,
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  farms: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    sizeUnit: {
      type: String,
      enum: ['acres', 'hectares'],
      default: 'acres'
    },
    
    soilType: String,
    crops: [String],
    location: {
      state: String,
      district: String,
      village: String,
      coordinates: {
        latitude: {
          type: Number,
          min: -90,
          max: 90
        },
        longitude: {
          type: Number,
          min: -180,
          max: 180
        }
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['farmer', 'admin', 'expert'],
    default: 'farmer'
  }
}, {
  timestamps: true
});

// Indexes
UserSchema.index({ phone: 1 });
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ 'farms.location.coordinates': '2dsphere' });

// Password Encryption
UserSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Password Verification
UserSchema.methods.matchPassword = async function(password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

// Virtual Properties
UserSchema.virtual('totalFarmArea').get(function() {
  return this.farms.reduce((total, farm) => {
    return total + (farm.sizeUnit === 'hectares' ? farm.size * 2.47105 : farm.size);
  }, 0);
});

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
