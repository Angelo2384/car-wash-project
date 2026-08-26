import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationCategory =
  | "appointments"
  | "rewards"
  | "promotions"
  | "system"
  | "reviews";

export interface AppNotification {
  id: string;
  userId: string;
  category: NotificationCategory;
  icon: "calendar" | "clock" | "star" | "crown" | "gift" | "check";
  iconColor: string;
  iconBg: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  createdAt: number;
  eventId?: string;
  link?: string;
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  appointments: boolean;
  rewards: boolean;
  promotions: boolean;
  systemUpdates: boolean;
  reviews: boolean;
  pushNotifications: boolean;
  email: boolean;
  sms: boolean;
  quietHours: boolean;
  quietFrom: string;
  quietTo: string;
  frequency: "instant" | "hourly" | "daily";
  sound: boolean;
  vibration: boolean;
}

export type NewNotificationInput = {
  title: string;
  message: string;
  category: NotificationCategory;
  icon?: "calendar" | "clock" | "star" | "crown" | "gift" | "check";
  iconColor?: string;
  iconBg?: string;
  link?: string;
  eventId?: string;
  metadata?: Record<string, any>;
};

interface NotificationsContextType {
  notifications: AppNotification[];
  allNotifications: AppNotification[];
  clearedNotifications: AppNotification[];
  unreadCount: number;
  clearedCount: number;
  settings: NotificationSettings;
  updateSetting: (key: keyof NotificationSettings, value: boolean | string) => void;
  addNotification: (input: NewNotificationInput) => AppNotification | null;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  deleteNotifications: (ids: string[]) => void;
  clearAll: () => void;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  appointments: true,
  rewards: true,
  promotions: true,
  systemUpdates: true,
  reviews: true,
  pushNotifications: true,
  email: true,
  sms: false,
  quietHours: false,
  quietFrom: "22:00",
  quietTo: "07:00",
  frequency: "instant",
  sound: true,
  vibration: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "Just now";
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return "Just now";
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? "hour" : "hours"} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDefaultCategoryVisuals(category: NotificationCategory) {
  switch (category) {
    case "appointments":
      return { icon: "calendar" as const, iconColor: "text-[#E86A33]", iconBg: "bg-[#E86A33]/10" };
    case "rewards":
      return { icon: "star" as const, iconColor: "text-[#35B86B]", iconBg: "bg-[#35B86B]/10" };
    case "promotions":
      return { icon: "gift" as const, iconColor: "text-[#FBBF24]", iconBg: "bg-[#FBBF24]/10" };
    case "reviews":
      return { icon: "star" as const, iconColor: "text-[#E86A33]", iconBg: "bg-[#E86A33]/10" };
    case "system":
    default:
      return { icon: "check" as const, iconColor: "text-[#35B86B]", iconBg: "bg-[#35B86B]/10" };
  }
}

function getStorageKey(uid?: string | null): string {
  return uid ? `ww_notifications_${uid}` : "ww_notifications_anonymous";
}

function getClearedStorageKey(uid?: string | null): string {
  return uid ? `ww_cleared_notifications_${uid}` : "ww_cleared_notifications_anonymous";
}

function getSettingsStorageKey(uid?: string | null): string {
  return uid ? `ww_notif_settings_${uid}` : "ww_notif_settings_anonymous";
}

// ─── Context Definition ───────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  allNotifications: [],
  clearedNotifications: [],
  unreadCount: 0,
  clearedCount: 0,
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  addNotification: () => null,
  markRead: () => {},
  markAllRead: () => {},
  deleteNotifications: () => {},
  clearAll: () => {},
  setNotifications: () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

// ─── Provider Component ───────────────────────────────────────────────────────

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const currentUidRef = useRef(uid);

  useEffect(() => {
    currentUidRef.current = uid;
  }, [uid]);

  // Load Settings for Current User
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    if (!uid) return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(getSettingsStorageKey(uid));
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (e) {
      console.warn("Failed to parse stored notification settings:", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Load Notifications for Current User (No hardcoded demo items!)
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(() => {
    if (!uid) return [];
    try {
      const stored = localStorage.getItem(getStorageKey(uid));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.filter((n) => n.userId === uid);
      }
    } catch (e) {
      console.warn("Failed to load notifications from localStorage:", e);
    }
    return [];
  });

  // Cleared notifications per user
  const [clearedNotifications, setClearedNotifications] = useState<AppNotification[]>(() => {
    if (!uid) return [];
    try {
      const stored = localStorage.getItem(getClearedStorageKey(uid));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.filter((n) => n.userId === uid);
      }
    } catch (e) {
      console.warn("Failed to load cleared notifications:", e);
    }
    return [];
  });

  // Sync state when user changes (User A -> User B or logout)
  useEffect(() => {
    if (!uid) {
      setAllNotifications([]);
      setClearedNotifications([]);
      setSettings(DEFAULT_SETTINGS);
      return;
    }

    // Load user settings
    try {
      const storedSettings = localStorage.getItem(getSettingsStorageKey(uid));
      if (storedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }

    // Load cached local notifications
    const key = getStorageKey(uid);
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setAllNotifications(parsed.filter((n) => n.userId === uid));
        } else {
          setAllNotifications([]);
        }
      } else {
        setAllNotifications([]);
      }
    } catch {
      setAllNotifications([]);
    }

    // Load cached cleared notifications
    const clearedKey = getClearedStorageKey(uid);
    try {
      const storedCleared = localStorage.getItem(clearedKey);
      if (storedCleared) {
        const parsedCleared = JSON.parse(storedCleared);
        if (Array.isArray(parsedCleared)) {
          setClearedNotifications(parsedCleared.filter((n) => n.userId === uid));
        } else {
          setClearedNotifications([]);
        }
      } else {
        setClearedNotifications([]);
      }
    } catch {
      setClearedNotifications([]);
    }

    // Real-time Firestore sync for authenticated user's notifications
    const notifsRef = collection(db, "users", uid, "notifications");
    const q = query(notifsRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: AppNotification[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
          });
          setAllNotifications(list);
          localStorage.setItem(key, JSON.stringify(list));
        }
      },
      (err) => {
        console.warn("Firestore notifications sync note:", err.message);
      }
    );

    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setAllNotifications(parsed.filter((n) => n.userId === uid));
        } catch {}
      }
      if (e.key === clearedKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setClearedNotifications(parsed.filter((n) => n.userId === uid));
        } catch {}
      }
      if (e.key === getSettingsStorageKey(uid) && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", handleStorage);
    };
  }, [uid]);

  // Persist notifications helper (LocalStorage + Firestore)
  const persistNotifications = useCallback(
    (updater: (prev: AppNotification[]) => AppNotification[]) => {
      const activeUid = currentUidRef.current;
      setAllNotifications((prev) => {
        const updated = updater(prev);
        if (activeUid) {
          const key = getStorageKey(activeUid);
          try {
            localStorage.setItem(key, JSON.stringify(updated));
          } catch (e) {
            console.warn("Failed to save notifications to localStorage:", e);
          }
        }
        return updated;
      });
    },
    []
  );

  // Persist cleared notifications helper
  const persistClearedNotifications = useCallback(
    (updater: (prev: AppNotification[]) => AppNotification[]) => {
      const activeUid = currentUidRef.current;
      setClearedNotifications((prev) => {
        const updated = updater(prev);
        if (activeUid) {
          const key = getClearedStorageKey(activeUid);
          try {
            localStorage.setItem(key, JSON.stringify(updated));
          } catch (e) {
            console.warn("Failed to save cleared notifications:", e);
          }
        }
        return updated;
      });
    },
    []
  );

  // Update setting handler
  const updateSetting = useCallback(
    (key: keyof NotificationSettings, value: boolean | string) => {
      const activeUid = currentUidRef.current;
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        if (activeUid) {
          try {
            localStorage.setItem(getSettingsStorageKey(activeUid), JSON.stringify(next));
          } catch (e) {
            console.warn("Failed to save notification settings:", e);
          }
        }
        return next;
      });
    },
    []
  );

  // Add Notification with deduplication & user association
  const addNotification = useCallback(
    (input: NewNotificationInput): AppNotification | null => {
      const activeUid = currentUidRef.current;
      if (!activeUid) {
        console.warn("Cannot add notification: user is not authenticated.");
        return null;
      }

      const { title, message, category, link, eventId, metadata } = input;
      const createdAt = Date.now();
      const visuals = getDefaultCategoryVisuals(category);

      let createdNotif: AppNotification | null = null;

      persistNotifications((prev) => {
        // Deduplication: check if same eventId exists
        if (eventId && prev.some((n) => n.eventId === eventId)) {
          return prev;
        }

        // Deduplication: check if identical notification was created within last 3 minutes
        const isDuplicate = prev.some(
          (n) =>
            n.title === title &&
            n.message === message &&
            Math.abs(n.createdAt - createdAt) < 1000 * 60 * 3
        );

        if (isDuplicate) {
          return prev;
        }

        const newNotif: AppNotification = {
          id: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          userId: activeUid,
          category,
          icon: input.icon || visuals.icon,
          iconColor: input.iconColor || visuals.iconColor,
          iconBg: input.iconBg || visuals.iconBg,
          title,
          message,
          time: "Just now",
          isRead: false,
          createdAt,
          eventId,
          link,
          metadata,
        };

        createdNotif = newNotif;

        // Persist to Firestore
        const notifDocRef = doc(db, "users", activeUid, "notifications", newNotif.id);
        setDoc(notifDocRef, newNotif).catch((err) => {
          console.warn("Failed to save notification in Firestore:", err);
        });

        return [newNotif, ...prev];
      });

      window.dispatchEvent(new Event("storage"));
      return createdNotif;
    },
    [persistNotifications]
  );

  // Mark read
  const markRead = useCallback(
    (ids: string[]) => {
      const activeUid = currentUidRef.current;
      persistNotifications((prev) =>
        prev.map((n) => {
          if (ids.includes(n.id)) {
            if (activeUid) {
              const docRef = doc(db, "users", activeUid, "notifications", n.id);
              setDoc(docRef, { isRead: true }, { merge: true }).catch(() => {});
            }
            return { ...n, isRead: true };
          }
          return n;
        })
      );
    },
    [persistNotifications]
  );

  // Mark all read
  const markAllRead = useCallback(() => {
    const activeUid = currentUidRef.current;
    persistNotifications((prev) =>
      prev.map((n) => {
        if (!n.isRead && activeUid) {
          const docRef = doc(db, "users", activeUid, "notifications", n.id);
          setDoc(docRef, { isRead: true }, { merge: true }).catch(() => {});
        }
        return { ...n, isRead: true };
      })
    );
  }, [persistNotifications]);

  // Delete notifications (moves them to cleared history)
  const deleteNotifications = useCallback(
    (ids: string[]) => {
      const activeUid = currentUidRef.current;
      let removedItems: AppNotification[] = [];

      persistNotifications((prev) => {
        removedItems = prev.filter((n) => ids.includes(n.id));
        return prev.filter((n) => !ids.includes(n.id));
      });

      if (removedItems.length > 0) {
        persistClearedNotifications((prevCleared) => [...removedItems, ...prevCleared]);
        if (activeUid) {
          ids.forEach((id) => {
            const docRef = doc(db, "users", activeUid, "notifications", id);
            deleteDoc(docRef).catch(() => {});
          });
        }
      }
    },
    [persistNotifications, persistClearedNotifications]
  );

  // Clear all notifications (moves all active to cleared history)
  const clearAll = useCallback(() => {
    const activeUid = currentUidRef.current;
    let allCurrent: AppNotification[] = [];

    persistNotifications((prev) => {
      allCurrent = [...prev];
      return [];
    });

    if (allCurrent.length > 0) {
      persistClearedNotifications((prevCleared) => [...allCurrent, ...prevCleared]);
      if (activeUid) {
        allCurrent.forEach((n) => {
          const docRef = doc(db, "users", activeUid, "notifications", n.id);
          deleteDoc(docRef).catch(() => {});
        });
      }
    }
  }, [persistNotifications, persistClearedNotifications]);

  // Active notifications for current user filtered by category settings
  const filteredNotifications = allNotifications
    .filter((n) => {
      if (n.userId && uid && n.userId !== uid) return false;
      if (n.category === "appointments" && !settings.appointments) return false;
      if (n.category === "rewards" && !settings.rewards) return false;
      if (n.category === "promotions" && !settings.promotions) return false;
      if (n.category === "system" && !settings.systemUpdates) return false;
      if (n.category === "reviews" && !settings.reviews) return false;
      return true;
    })
    .map((n) => ({
      ...n,
      time: n.createdAt ? formatRelativeTime(n.createdAt) : n.time,
    }));

  const unreadCount = filteredNotifications.filter((n) => !n.isRead).length;
  const clearedCount = clearedNotifications.length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications: filteredNotifications,
        allNotifications,
        clearedNotifications,
        unreadCount,
        clearedCount,
        settings,
        updateSetting,
        addNotification,
        markRead,
        markAllRead,
        deleteNotifications,
        clearAll,
        setNotifications: setAllNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
