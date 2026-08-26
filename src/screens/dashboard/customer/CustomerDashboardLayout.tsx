import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  History,
  Gift,
  Star,
  Settings,
  Bell,
  Crown,
  LogOut,
  MessageSquare,
  Info,
  CalendarCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import ThemeToggle from "../../../components/ui/ThemeToggle";
import LogoutConfirmationModal from "../../../components/ui/LogoutConfirmationModal";
import { useNotifications, type AppNotification } from "../../../contexts/NotificationsContext";

// ─── Bell Dropdown ────────────────────────────────────────────────────────────

function NotifPreviewIcon({ type, color, bg }: { type: AppNotification["icon"]; color: string; bg: string }) {
  const Icon =
    type === "calendar" ? CalendarCheck :
    type === "clock" ? Clock :
    type === "star" ? Star :
    type === "crown" ? Crown :
    type === "gift" ? Gift :
    CheckCircle2;
  return (
    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
  );
}

function BellDropdown({ onViewAll, onClose }: { onViewAll: () => void; onClose: () => void }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead } = useNotifications();
  // Show up to 5: unread first, then read
  const preview = [
    ...notifications.filter((n) => !n.isRead),
    ...notifications.filter((n) => n.isRead),
  ].slice(0, 5);

  const handleClickItem = (notif: AppNotification) => {
    if (!notif.isRead) markRead([notif.id]);
    onClose();
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="absolute right-0 top-[calc(100%+10px)] w-[360px] bg-[#1A1A1A] border border-[#2C2C2C] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2C2C2C]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#E86A33] text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markRead(notifications.filter((n) => !n.isRead).map((n) => n.id))}
            className="text-[11px] text-[#E86A33] font-medium hover:text-[#FF8055] transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[340px] overflow-y-auto">
        {preview.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-[#222] border border-[#2C2C2C] flex items-center justify-center mb-2.5">
              <Bell className="w-4 h-4 text-[#71717A]" />
            </div>
            <p className="text-[13px] font-semibold text-[#F5F5F5] mb-1">No notifications yet</p>
            <p className="text-[11px] text-[#71717A] leading-relaxed">
              You're all caught up. Notifications about your appointments, rewards, and updates will appear here.
            </p>
          </div>
        ) : (
          preview.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClickItem(notif)}
              className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left border-b border-[#232323] last:border-0 relative ${
                !notif.isRead ? "bg-[#1E1E1E]" : ""
              }`}
            >
              {!notif.isRead && (
                <div className="absolute left-0 top-2 bottom-2 w-[2.5px] bg-[#E86A33] rounded-full" />
              )}
              <NotifPreviewIcon type={notif.icon} color={notif.iconColor} bg={notif.iconBg} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[12px] font-semibold truncate ${notif.isRead ? "text-[#E5E5E5]" : "text-white"}`}>
                    {notif.title}
                  </span>
                  {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#E86A33] shrink-0" />}
                </div>
                <p className="text-[11px] text-[#71717A] leading-relaxed line-clamp-2">{notif.message}</p>
                <p className="text-[10px] text-[#52525B] mt-1">{notif.time}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[#2C2C2C]">
        <button
          onClick={onViewAll}
          className="w-full text-center text-[12px] font-semibold text-[#E86A33] hover:text-[#FF8055] transition-colors py-1"
        >
          View all notifications →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { unreadCount } = useNotifications();

  // Bell dropdown state
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);
  const { theme } = useTheme();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const uid = currentUser?.uid;
      if (uid) {
        localStorage.removeItem(`ww_profile_name_${uid}`);
        localStorage.removeItem(`ww_profile_phone_${uid}`);
        localStorage.removeItem(`ww_profile_avatar_${uid}`);
      }
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  // Use uid-scoped localStorage keys (matching CustomerProfile) so each user
  // sees only their own saved data. Firebase values take priority for name
  // (kept in sync via updateProfile); localStorage leads for avatar (base64).
  const uid = currentUser?.uid;

  const [hasMembership, setHasMembership] = useState<boolean>(() => {
    if (!uid) return false;
    const cached = localStorage.getItem(`ww_has_membership_${uid}`);
    return cached ? JSON.parse(cached) : false;
  });

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          const mem = snap.data()?.hasMembership === true;
          setHasMembership(mem);
          localStorage.setItem(`ww_has_membership_${uid}`, JSON.stringify(mem));
        }
      },
      (err) => {
        console.error("Failed to load user membership in layout:", err);
      }
    );

    const handleMembershipChange = () => {
      const cached = localStorage.getItem(`ww_has_membership_${uid}`);
      if (cached) {
        setHasMembership(JSON.parse(cached));
      }
    };

    window.addEventListener("ww_membership_changed", handleMembershipChange);
    window.addEventListener("storage", handleMembershipChange);

    return () => {
      unsub();
      window.removeEventListener("ww_membership_changed", handleMembershipChange);
      window.removeEventListener("storage", handleMembershipChange);
    };
  }, [uid]);
  const displayName =
    currentUser?.displayName ||
    (uid ? localStorage.getItem(`ww_profile_name_${uid}`) : null) ||
    "Alex Burns";
  const firstName = displayName.split(" ")[0] || "Alex";
  const photoURL =
    (uid ? localStorage.getItem(`ww_profile_avatar_${uid}`) : null) ||
    currentUser?.photoURL ||
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150";

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard/customer",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      name: "My Appointments",
      path: "/dashboard/customer/appointments",
      icon: <CalendarDays className="w-4 h-4" />,
    },
    {
      name: "Notifications",
      path: "/dashboard/customer/notifications",
      icon: <Bell className="w-4 h-4" />,
    },
    {
      name: "Packages",
      path: "/dashboard/customer/packages",
      icon: <History className="w-4 h-4" />,
    },
    {
      name: "Rewards",
      path: "/dashboard/customer/rewards",
      icon: <Gift className="w-4 h-4" />,
    },
    {
      name: "My Reviews",
      path: "/dashboard/customer/reviews",
      icon: <MessageSquare className="w-4 h-4" />,
    },
    { name: "Membership", path: "/dashboard/customer/membership", icon: <Star className="w-4 h-4" /> },
    { name: "Contact Us", path: "/dashboard/customer/contact", icon: <Info className="w-4 h-4" /> },
    { name: "About Us", path: "/dashboard/customer/about-us", icon: <Info className="w-4 h-4" /> },
  ];

  const isProfileActive = location.pathname === "/dashboard/customer/profile";

  return (
    <div className={theme}>
      <div className="min-h-screen bg-[#101010] font-sans flex text-[#F5F5F5] transition-colors duration-300 selection:bg-[#E86A33] selection:text-white relative">
        {/* Atmospheric Dark-Mode Effect */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(circle at 80% 0%, rgba(232,106,51,0.035), transparent 35%)",
          }}
        ></div>

        {/* Sidebar */}
        <aside className="w-[240px] bg-[#171717] border-r border-[#2C2C2C] fixed inset-y-0 left-0 flex flex-col z-20">
          {/* Logo */}
          <div className="h-[64px] flex items-center px-6 border-b border-[#2C2C2C]">
            <Link to="/dashboard/customer" className="flex items-center group">
              <img
                src="/images/logo.png"
                alt="WashWizzy"
                className="w-24 h-auto object-contain"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-[16px] py-[11px] min-h-[46px] rounded-lg transition-all font-medium text-[14px] ${
                    isActive
                      ? "bg-[rgba(232,106,51,0.10)] text-[#E86A33]"
                      : "text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#F5F5F5]"
                  }`}
                >
                  <div className="[&>svg]:w-[18px] [&>svg]:h-[18px]">
                    {item.icon}
                  </div>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-[#2C2C2C] mt-auto">
            <Link
              to="/dashboard/customer/profile"
              className={`flex items-center gap-3 px-[16px] py-[11px] min-h-[48px] rounded-lg transition-colors cursor-pointer group ${
                isProfileActive
                  ? "bg-[rgba(232,106,51,0.10)] text-[#E86A33] border border-[#E86A33]/20"
                  : "hover:bg-white/[0.04]"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-[#1F1F1F] overflow-hidden shrink-0 border border-[#2C2C2C]">
                <img
                  src={photoURL}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[13px] font-medium truncate ${
                    isProfileActive ? "text-[#E86A33]" : "text-[#F5F5F5]"
                  }`}
                >
                  {displayName}
                </p>
                <p
                  className={`text-[11px] truncate mt-0.5 ${
                    isProfileActive ? "text-[#E86A33]/80" : "text-[#A1A1AA]"
                  }`}
                >
                  Manage Account
                </p>
              </div>
              <Settings
                className={`w-4 h-4 transition-colors ${
                  isProfileActive
                    ? "text-[#E86A33]"
                    : "text-[#71717A] group-hover:text-[#A1A1AA]"
                }`}
              />
            </Link>

            {/* Log Out Button */}
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="mt-1.5 w-full flex items-center gap-3.5 px-[16px] py-[11px] min-h-[46px] rounded-lg transition-all font-medium text-[14px] text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#F5F5F5] cursor-pointer"
            >
              <div className="[&>svg]:w-[18px] [&>svg]:h-[18px]">
                <LogOut className="w-4 h-4" />
              </div>
              Log Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 ml-[240px] flex flex-col min-h-screen relative z-10">
          {/* Top Bar */}
          <header className="h-[64px] bg-[#101010]/80 backdrop-blur-md shadow-md border-b border-[#2C2C2C] sticky top-0 z-10 px-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[14px] text-[#A1A1AA] font-medium">
                Welcome back,
              </p>
              <h1 className="text-[14px] font-semibold text-[#F5F5F5]">
                {firstName}
              </h1>
            </div>

            <div className="flex items-center gap-6">
              {hasMembership ? (
                <button
                  onClick={() => navigate("/dashboard/customer/membership")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30 hover:bg-[#35B86B]/25 transition-colors cursor-pointer"
                >
                  <Crown className="w-[14px] h-[14px] text-[#35B86B]" />
                  Member
                </button>
              ) : (
                <button
                  onClick={() => navigate("/dashboard/customer/membership")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[#E86A33]/10 text-[#E86A33] hover:bg-[#E86A33]/20 transition-colors border border-[#E86A33]/20 cursor-pointer"
                >
                  <Crown className="w-[14px] h-[14px]" />
                  Upgrade
                </button>
              )}

              <div className="h-5 w-px bg-[#2C2C2C]"></div>

              <div className="flex items-center gap-3">
                {/* Global Theme Toggle */}
                <ThemeToggle size={18} />

                {/* Bell: opens quick-preview dropdown */}
                <div ref={bellRef} className="relative flex items-center justify-center">
                  <button
                    onClick={() => setBellOpen((o) => !o)}
                    className="p-2 rounded-xl text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E86A33]/50 active:scale-95 relative flex items-center justify-center"
                    aria-label="Notifications"
                    title="Notifications"
                  >
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      <Bell className="w-[18px] h-[18px]" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#E86A33] rounded-full ring-2 ring-[#101010]" />
                      )}
                    </div>
                  </button>
                  {bellOpen && (
                    <BellDropdown
                      onClose={() => setBellOpen(false)}
                      onViewAll={() => {
                        setBellOpen(false);
                        navigate("/dashboard/customer/notifications");
                      }}
                    />
                  )}
                </div>

                <Link
                  to="/dashboard/customer/profile"
                  className="w-8 h-8 rounded-full bg-[#1F1F1F] overflow-hidden border border-[#2C2C2C] hover:border-[#E86A33] transition-colors shrink-0 flex items-center justify-center ml-1"
                >
                  <img
                    src={photoURL}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </Link>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-5">
            <div className="max-w-[1400px] mx-auto">
              <Outlet context={{ theme }} />
            </div>
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
      />
    </div>
  );
}
