// src/services/userService.ts
import { User, IUser } from '../models/User';
import { hashPassword, comparePassword } from '../utils/passwordUtils';
import { generateToken } from '../utils/tokenGenerator';
import { processAndUploadImage } from '../utils/imageProcessor';

interface UserRegistrationData {
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

interface FarmData {
  name: string;
  size: number;
  sizeUnit: 'acres' | 'hectares';
  soilType?: string;
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

class UserService {
  async registerUser(userData: UserRegistrationData): Promise<{ user: IUser; token: string }> {
    const existingUser = await User.findOne({ phone: userData.phone });
    if (existingUser) {
      throw new Error('User with this phone number already exists');
    }

    const hashedPassword = await hashPassword(userData.password);
    const user = await User.create({
      ...userData,
      password: hashedPassword,
      language: userData.language || 'en',
      location: userData.location || {},
      farmDetails: [],
      isVerified: false,
      role: 'farmer',
    });

    const token = generateToken(user._id.toString());
    return { user, token };
  }

  async loginUser(phone: string, password: string): Promise<{ user: IUser; token: string }> {
    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken(user._id.toString());
    return { user, token };
  }

  async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateUserProfile(userId: string, updateData: Partial<UserRegistrationData>): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    user.password = await hashPassword(newPassword);
    await user.save();
    return true;
  }

  async uploadProfilePicture(userId: string, file: Express.Multer.File): Promise<IUser> {
    const imageUrl = await processAndUploadImage(file, `profile/${userId}`);

    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: imageUrl },
      { new: true }
    );
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async addFarmDetails(userId: string, farmData: FarmData): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { farmDetails: { ...farmData, createdAt: new Date() } } },
      { new: true }
    );
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateFarmDetails(userId: string, farmId: string, updateData: Partial<FarmData>): Promise<IUser> {
    const user = await User.findOneAndUpdate(
      { _id: userId, 'farmDetails._id': farmId },
      { $set: { 'farmDetails.$': { ...updateData, _id: farmId } } },
      { new: true }
    );
    if (!user) {
      throw new Error('User or farm not found');
    }
    return user;
  }

  async deleteFarm(userId: string, farmId: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { farmDetails: { _id: farmId } } },
      { new: true }
    );
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async verifyUser(userId: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { isVerified: true },
      { new: true }
    );
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

export const userService = new UserService();
export default userService;
