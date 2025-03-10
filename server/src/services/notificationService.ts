// import { Notification, INotification, NotificationType, NotificationCategory, NotificationPriority } from '../models/Notification';

// interface CreateNotificationDto {
//   userId: string;
//   title: string;
//   message: string;
//   type: NotificationType;
//   category: NotificationCategory;
//   priority: NotificationPriority;
//   actionRequired: boolean;
//   relatedEntityType?: string;
//   relatedEntityId?: string;
//   expiresAt?: Date;
// }

// interface NotificationFilter {
//   read?: boolean;
//   category?: NotificationCategory;
//   priority?: NotificationPriority;
//   actionRequired?: boolean;
//   startDate?: Date;
//   endDate?: Date;
// }

// export const notificationService = {
//   async createNotification(data: CreateNotificationDto): Promise<INotification> {
//     try {
//       const notification = await Notification.create({
//         ...data,
//         read: false,
//         actionTaken: false,
//         readAt: null,
//         actionTakenAt: null
//       });

//       // If notification is urgent, we might want to trigger additional actions
//       if (data.priority === 'urgent') {
//         await this.handleUrgentNotification(notification);
//       }

//       return notification;
//     } catch (error) {
//       throw new ApiError(`Failed to create notification: ${error.message}`, 500);
//     }
//   },

//   async getUserNotifications(
//     userId: string,
//     page = 1,
//     limit = 20,
//     filter?: NotificationFilter
//   ) {
//     const query: any = { userId };
    
//     if (filter) {
//       if (filter.read !== undefined) query.read = filter.read;
//       if (filter.category) query.category = filter.category;
//       if (filter.priority) query.priority = filter.priority;
//       if (filter.actionRequired !== undefined) query.actionRequired = filter.actionRequired;
//       if (filter.startDate && filter.endDate) {
//         query.createdAt = {
//           $gte: filter.startDate,
//           $lte: filter.endDate
//         };
//       }
//     }

//     const [notifications, total, unreadCount] = await Promise.all([
//       Notification.find(query)
//         .sort({ priority: 1, createdAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(limit),
//       Notification.countDocuments(query),
//       Notification.countDocuments({ userId, read: false })
//     ]);

//     return { notifications, total, unreadCount, page, limit };
//   },

//   async markAsRead(notificationId: string, userId: string): Promise<INotification> {
//     const notification = await this.validateUserNotification(notificationId, userId);
    
//     notification.read = true;
//     notification.readAt = new Date();
//     await notification.save();

//     return notification;
//   },

//   async markAllAsRead(userId: string): Promise<number> {
//     const result = await Notification.updateMany(
//       { userId, read: false },
//       { 
//         read: true, 
//         readAt: new Date(),
//         updatedAt: new Date()
//       }
//     );

//     return result.modifiedCount;
//   },

//   async markActionTaken(notificationId: string, userId: string): Promise<INotification> {
//     const notification = await this.validateUserNotification(notificationId, userId);
    
//     notification.actionTaken = true;
//     notification.actionTakenAt = new Date();
//     await notification.save();

//     return notification;
//   },

//   async deleteNotification(notificationId: string, userId: string): Promise<void> {
//     const notification = await this.validateUserNotification(notificationId, userId);
//     await notification.deleteOne();
//   },

//   async getNotificationStats(userId: string) {
//     const [categoryCount, priorityCount, actionRequired] = await Promise.all([
//       Notification.aggregate([
//         { $match: { userId: userId } },
//         { $group: { _id: '$category', count: { $sum: 1 } } }
//       ]),
//       Notification.aggregate([
//         { $match: { userId: userId } },
//         { $group: { _id: '$priority', count: { $sum: 1 } } }
//       ]),
//       Notification.countDocuments({ userId, actionRequired: true, actionTaken: false })
//     ]);

//     return {
//       byCategory: Object.fromEntries(categoryCount.map(c => [c._id, c.count])),
//       byPriority: Object.fromEntries(priorityCount.map(p => [p._id, p.count])),
//       pendingActions: actionRequired
//     };
//   },

//   async deleteExpiredNotifications(): Promise<number> {
//     const result = await Notification.deleteMany({
//       expiresAt: { $lt: new Date() }
//     });
//     return result.deletedCount;
//   },

//   private async validateUserNotification(notificationId: string, userId: string): Promise<INotification> {
//     const notification = await Notification.findById(notificationId);
    
//     if (!notification) {
//       throw new ApiError('Notification not found', 404);
//     }
    
//     if (notification.userId.toString() !== userId) {
//       throw new ApiError('Unauthorized access to notification', 403);
//     }

//     return notification;
//   },

//   private async handleUrgentNotification(notification: INotification): Promise<void> {
//     // Here you could implement urgent notification handling
//     // For example: Send SMS, push notification, email, etc.
//     // This would integrate with your smsService or other notification channels
//   }
// };

// export default notificationService;
