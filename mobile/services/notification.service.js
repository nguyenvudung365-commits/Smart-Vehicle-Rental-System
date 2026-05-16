import api from './api';

export const notificationService = {
  getMyNotifications: async () => {
    const res = await api.get('/notifications');
    const list = res.data?.data || [];
    return {
      success: true,
      data: {
        list,
        unreadCount: list.filter(n => !n.isRead).length,
      },
    };
  },
  markRead: (id) => api.patch(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then(r => r.data),
};
