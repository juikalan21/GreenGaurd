import mongoose, { Document, Schema } from 'mongoose';

// Enums
enum NotificationType {
  ALERT = 'alert',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

enum Category {
  WEATHER = 'weather',
  SOIL = 'soil',
  CROP = 'crop',
  PEST = 'pest',
  SYSTEM = 'system',
  OTHER = 'other'
}

enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

enum Channel {
  APP = 'app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

// Interfaces
interface IAction {
  type: string;
  label: string;
  url?: string;
  payload?: Record<string, any>;
  completed: boolean;
  completedAt?: Date;
}

interface IDeliveryStatus {
  channel: Channel;
  sent: boolean;
  sentAt?: Date;
  delivered: boolean;
  deliveredAt?: Date;
  error?: string;
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  farmId?: string;
  title: string;
  message: string;
  type: NotificationType;
  category: Category;
  priority: Priority;
  read: boolean;
  readAt?: Date;
  actions?: IAction[];
  metadata?: {
    location?: {
      latitude: number;
      longitude: number;
    };
    images?: string[];
    tags?: string[];
  };
  delivery: {
    channels: IDeliveryStatus[];
    retries: number;
    lastRetry?: Date;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  markAsRead(): Promise<void>;
  completeAction(actionIndex: number): Promise<void>;
}

const NotificationSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  farmId: {
    type: String,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: Object.values(NotificationType),
    default: NotificationType.INFO
  },
  category: {
    type: String,
    enum: Object.values(Category),
    required: true
  },
  priority: {
    type: String,
    enum: Object.values(Priority),
    default: Priority.MEDIUM
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,
  actions: [{
    type: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    url: String,
    payload: Schema.Types.Mixed,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  metadata: {
    location: {
      latitude: Number,
      longitude: Number
    },
    images: [String],
    tags: [String]
  },
  delivery: {
    channels: [{
      channel: {
        type: String,
        enum: Object.values(Channel),
        required: true
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      error: String
    }],
    retries: {
      type: Number,
      default: 0
    },
    lastRetry: Date
  },
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
NotificationSchema.index({ userId: 1, category: 1 });
NotificationSchema.index({ userId: 1, priority: 1 });
NotificationSchema.index({ createdAt: -1 });

// Instance Methods
NotificationSchema.methods.markAsRead = async function(): Promise<void> {
  this.read = true;
  this.readAt = new Date();
  await this.save();
};

NotificationSchema.methods.completeAction = async function(actionIndex: number): Promise<void> {
  if (this.actions?.[actionIndex]) {
    this.actions[actionIndex].completed = true;
    this.actions[actionIndex].completedAt = new Date();
    await this.save();
  }
};

// Static Methods
NotificationSchema.statics.getUnreadCount = async function(
  userId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({ userId, read: false });
};

NotificationSchema.statics.getPendingNotifications = async function(
  userId: mongoose.Types.ObjectId,
  options: { priority?: Priority; category?: Category } = {}
): Promise<INotification[]> {
  const query = {
    userId,
    read: false,
    ...options
  };
  return this.find(query).sort({ priority: -1, createdAt: -1 });
};

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
