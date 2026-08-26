import React, { createContext, useContext, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationCategory = "appointments" | "rewards" | "promotions" | "system" | "reviews";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  icon: "calendar" | "clock" | "star" | "crown" | "gift" | "check";
  iconColor: string;
  iconBg: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  deleteNotifications: (ids: string[]) => void;
  clearAll: () => void;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}

// ─── Initial seed data ────────────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    category: "appointments",
    icon: "calendar",
    iconColor: "text-[#E86A33]",
    iconBg: "bg-[#E86A33]/10",
    title: "Appointment Confirmed",
    message:
      "Your premium detailing appointment has been confirmed for tomorrow at 10:00 AM.",
    time: "10 minutes ago",
    isRead: false,
  },
  {
    id: "n2",
    category: "appointments",
    icon: "clock",
    iconColor: "text-[#E86A33]",
    iconBg: "bg-[#E86A33]/10",
    title: "Appointment Reminder",
    message:
      "Your detailing appointment is tomorrow at 10:00 AM. Please ensure your vehicle is accessible.",
    time: "2 hours ago",
    isRead: false,
  },
  {
    id: "n3",
    category: "rewards",
    icon: "star",
    iconColor: "text-[#35B86B]",
    iconBg: "bg-[#35B86B]/10",
    title: "Reward Points Added",
    message: "You've earned 150 reward points for your recent Platinum Wash.",
    time: "Yesterday",
    isRead: true,
  },
  {
    id: "n4",
    category: "rewards",
    icon: "crown",
    iconColor: "text-[#A78BFA]",
    iconBg: "bg-[#A78BFA]/10",
    title: "VIP Membership Benefit",
    message: "Enjoy 20% off your next interior detail as a valued VIP member.",
    time: "Yesterday",
    isRead: true,
  },
  {
    id: "n5",
    category: "promotions",
    icon: "gift",
    iconColor: "text-[#FBBF24]",
    iconBg: "bg-[#FBBF24]/10",
    title: "Special Offer",
    message:
      "Save 15% on your next service when you book before the end of the month.",
    time: "2 days ago",
    isRead: true,
  },
  {
    id: "n6",
    category: "system",
    icon: "check",
    iconColor: "text-[#35B86B]",
    iconBg: "bg-[#35B86B]/10",
    title: "Payment Successful",
    message:
      "Your payment of $120.00 for the Signature Detail was processed successfully.",
    time: "3 days ago",
    isRead: true,
  },
  {
    id: "n7",
    category: "reviews",
    icon: "star",
    iconColor: "text-[#E86A33]",
    iconBg: "bg-[#E86A33]/10",
    title: "Rate Your Recent Service",
    message: "Tell us about your experience with our team and receive 50 bonus points.",
    time: "4 days ago",
    isRead: true,
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
  deleteNotifications: () => {},
  clearAll: () => {},
  setNotifications: () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = useCallback((ids: string[]) => {
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const deleteNotifications = useCallback((ids: string[]) => {
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markRead,
        markAllRead,
        deleteNotifications,
        clearAll,
        setNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
