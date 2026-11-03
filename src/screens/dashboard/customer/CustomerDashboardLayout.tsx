import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Gift,
  Star,
  Bell,
  Crown,
  Menu,
  MessageSquare,
  Info,
  LifeBuoy,
  CalendarCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { avatarUrl } from "../../../lib/cloudinary";
import { useAuth } from "../../../contexts/AuthContext";
import { useCustomerJobNotifications } from "../../../hooks/useCustomerJobNotifications";
import { useTheme } from "../../../contexts/ThemeContext";
import ThemeToggle from "../../../components/ui/ThemeToggle";
import ProfileChip from "../../../components/ui/ProfileChip";
import DashboardSidebar from "../../../components/dashboard/DashboardSidebar";
import Tooltip from "../../../components/ui/Tooltip";
import PageHeading from "../../../components/ui/PageHeading";
import { DASHBOARD_BAR_HEIGHT, findPageHeading, type PageHeadingDef } from "../../../lib/pageHeadings";
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

// ─── Page headings shown in the top bar ──────────────────────────────────────

const PAGE_HEADINGS: PageHeadingDef[] = [
  { path: "", title: "Dashboard", description: "Your bookings, rewards and membership at a glance" },
  { path: "appointments/reschedule", title: "Reschedule appointment", description: "Choose a new date and time for your booking" },
  { path: "appointments/cancel", title: "Cancel booking", description: "Cancel your booking and see what you'll be refunded" },
  { path: "appointments", title: "My Appointments", description: "Manage your upcoming bookings and requests" },
  { path: "packages", title: "Packages", description: "Choose the right package for your car" },
  { path: "booking", title: "Book appointment", description: "Complete your booking details below" },
  { path: "custom-package", title: "Build a custom package", description: "Pick individual services and see your price as you go" },
  { path: "checkout", title: "Checkout", description: "Review your booking and complete payment" },
  { path: "notifications", title: "Notifications", description: "Updates on your appointments, rewards and account" },
  { path: "rewards", title: "Rewards", description: "Earn points on every wash and unlock perks" },
  { path: "reviews", title: "My Reviews", description: "Share and manage feedback on your washes" },
  { path: "membership", title: "Membership", description: "Zero call-out fees, priority scheduling and member discounts" },
  { path: "profile", title: "My Profile", description: "Manage your account, vehicles and preferences" },
  { path: "contact", title: "Contact Us", description: "Get help with a booking, payment or your account" },
  { path: "about-us", title: "About Us", description: "Who we are and how WashWizzy works" },
];


export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { unreadCount } = useNotifications();
  useCustomerJobNotifications(currentUser?.uid);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const [savedPhotoURL, setSavedPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          const mem = snap.data()?.hasMembership === true;
          setHasMembership(mem);
          localStorage.setItem(`ww_has_membership_${uid}`, JSON.stringify(mem));
          setSavedPhotoURL(snap.data()?.photoURL || null);
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
  const pageHeading = findPageHeading(location.pathname, "/dashboard/customer", PAGE_HEADINGS);
  const photoURL =
    avatarUrl(savedPhotoURL || currentUser?.photoURL, 96);

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard/customer",
      icon: <LayoutDashboard className="w-4 h-4" />,
      exact: true,
    },
    {
      name: "My Appointments",
      path: "/dashboard/customer/appointments",
      icon: <CalendarDays className="w-4 h-4" />,
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
  ];

  // Secondary links, kept small at the bottom of the sidebar
  const supportItems = [
    { name: "Contact Us", path: "/dashboard/customer/contact", icon: <LifeBuoy className="w-4 h-4" /> },
    { name: "About Us", path: "/dashboard/customer/about-us", icon: <Info className="w-4 h-4" /> },
  ];

  const isProfileActive = location.pathname === "/dashboard/customer/profile";

  return (
    <div className={theme} data-dashboard-root>
      <div className="min-h-screen bg-[#101010] font-sans flex text-[#F5F5F5] transition-colors duration-300 selection:bg-[#E86A33] selection:text-white relative">

        <DashboardSidebar
          homePath="/dashboard/customer"
          items={navItems}
          footerItems={supportItems}
          onLogout={() => setIsLogoutModalOpen(true)}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-[240px] flex flex-col min-h-screen relative z-10 min-w-0">
          {/* Top Bar */}
          <header className={`${DASHBOARD_BAR_HEIGHT} bg-[#101010]/80 backdrop-blur-md shadow-md border-b border-[#2C2C2C] sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between`}>
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04] lg:hidden cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <PageHeading heading={pageHeading} />
            </div>

            <div className="flex items-center gap-3">
              {hasMembership ? (
                <button
                  onClick={() => navigate("/dashboard/customer/membership")}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-bold uppercase tracking-wider bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30 hover:bg-[#35B86B]/25 transition-colors cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-[#35B86B]" />
                  Member
                </button>
              ) : (
                <button
                  onClick={() => navigate("/dashboard/customer/membership")}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-bold uppercase tracking-wider bg-burnt-orange hover:bg-burnt-orange-dark text-white shadow-md shadow-burnt-orange/20 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E86A33]"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade
                </button>
              )}

              <div className="h-5 w-px bg-[#2C2C2C]" aria-hidden="true"></div>

              <div className="flex items-center gap-1">
                {/* Global Theme Toggle */}
                <ThemeToggle size={18} />

                {/* Bell: opens quick-preview dropdown */}
                <div ref={bellRef} className="relative flex items-center justify-center">
                  <Tooltip label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"} disabled={bellOpen}>
                    <button
                      onClick={() => setBellOpen((o) => !o)}
                      className="p-2 rounded-xl text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E86A33]/50 active:scale-95 relative flex items-center justify-center"
                      aria-label="Notifications"
                    >
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        <Bell className="w-[18px] h-[18px]" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#E86A33] rounded-full ring-2 ring-[#101010]" />
                        )}
                      </div>
                    </button>
                  </Tooltip>
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

                <ProfileChip
                  name={displayName}
                  photoURL={photoURL}
                  to="/dashboard/customer/profile"
                  active={isProfileActive}
                />
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
