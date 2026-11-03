import { useState, useEffect, useRef } from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Star,
  Bell,
  CalendarCheck,
  Clock,
  CheckCircle2,
  Crown,
  Gift,
  Menu,
  ShieldOff,
  Ticket,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { avatarUrl } from "../../../lib/cloudinary";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import ThemeToggle from "../../../components/ui/ThemeToggle";
import ProfileChip from "../../../components/ui/ProfileChip";
import DashboardSidebar from "../../../components/dashboard/DashboardSidebar";
import { subscribeToOwnStaffSettings, type WorkType } from "../../../lib/staffOps";
import { useCrews } from "../../../hooks/useOperations";
import StaffUndoBar from "../../../components/staff/StaffUndoBar";
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

function BellDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markRead } = useNotifications();
  // Show up to 5: unread first, then read
  const preview = [
    ...notifications.filter((n) => !n.isRead),
    ...notifications.filter((n) => n.isRead),
  ].slice(0, 5);

  return (
    <div className="absolute right-0 top-[calc(100%+10px)] w-[340px] sm:w-[360px] bg-[#171717] border border-[#2C2C2C] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden text-left">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2C2C2C]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#F5F5F5]">Staff Alerts</span>
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
      <div className="max-h-[320px] overflow-y-auto divide-y divide-[#2C2C2C]/50">
        {preview.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Bell className="w-8 h-8 text-[#52525B] mb-2" />
            <p className="text-[12px] text-[#71717A]">No new notifications</p>
          </div>
        ) : (
          preview.map((notif) => (
            <button
              key={notif.id}
              onClick={() => {
                if (!notif.isRead) markRead([notif.id]);
              }}
              className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left relative ${
                !notif.isRead ? "bg-[#1F1F1F]" : ""
              }`}
            >
              {!notif.isRead && (
                <div className="absolute left-0 top-2 bottom-2 w-[2.5px] bg-[#E86A33] rounded-full" />
              )}
              <NotifPreviewIcon type={notif.icon} color={notif.iconColor} bg={notif.iconBg} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[12px] font-semibold truncate ${notif.isRead ? "text-[#D8D5CF]" : "text-[#F5F5F5]"}`}>
                    {notif.title}
                  </span>
                  {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#E86A33] shrink-0" />}
                </div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed line-clamp-2">{notif.message}</p>
                <p className="text-[10px] text-[#71717A] mt-1">{notif.time}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[#2C2C2C] bg-[#101010]/50">
        <button
          onClick={onClose}
          className="w-full text-center text-[12px] font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors py-1"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// Page titles shown in the top bar (pages don't render their own)
const PAGE_HEADINGS: PageHeadingDef[] = [
  { path: "", title: "Dashboard", description: "Your jobs and walk-ins for today" },
  { path: "appointments", title: "My Assigned Jobs", description: "Review and manage bookings the owner has assigned to you" },
  { path: "reviews", title: "Reviews", description: "Feedback customers have left on your washes" },
  { path: "walk-ins", title: "Walk-ins", description: "Today's walk-in tickets at the bay" },
  { path: "profile", title: "My Profile", description: "Manage your staff account and details" },
];

export default function StaffDashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();

  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    getDoc(doc(db, "users", currentUser.uid))
      .then((snap) => {
        if (cancelled) return;
        const role = snap.exists() ? snap.data().role || "customer" : "customer";
        if (role === "staff" || role === "admin") {
          setIsAuthorized(true);
        } else {
          setRedirectTo(`/dashboard/${role}`);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAuthorized(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Mobile sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // The admin can deactivate a staff account; it then can't use the staff area
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [ownWorkType, setOwnWorkType] = useState<WorkType>("mobile");
  useEffect(() => {
    if (!currentUser?.uid) return;
    return subscribeToOwnStaffSettings(currentUser.uid, (s) => {
      setIsDeactivated(s.active === false);
      setOwnWorkType(s.workType);
    });
  }, [currentUser?.uid]);
  // Crews work as one unit, so a crew's work type wins over the person's own
  const crews = useCrews();
  const myCrew = crews.find((c) => currentUser?.uid && c.memberUids.includes(currentUser.uid));
  const onBay = (myCrew?.workType ?? ownWorkType) === "bay";

  // Bell dropdown state
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

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

  // Close mobile sidebar on route change
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMobileMenuOpen(false);
  }

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

  const displayName =
    currentUser?.displayName ||
    (uid ? localStorage.getItem(`ww_profile_name_${uid}`) : null) ||
    "Staff Member";
  const pageHeading = findPageHeading(location.pathname, "/dashboard/staff", PAGE_HEADINGS);
  const photoURL =
    avatarUrl(currentUser?.photoURL, 96);

  // Navigation Items required for Staff Sidebar
  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard/staff",
      icon: <LayoutDashboard className="w-4 h-4" />,
      exact: true,
    },
    {
      name: "My Appointments",
      path: "/dashboard/staff/appointments",
      icon: <CalendarDays className="w-4 h-4" />,
      exact: false,
    },
    ...(onBay
      ? [
          {
            name: "Walk-ins",
            path: "/dashboard/staff/walk-ins",
            icon: <Ticket className="w-4 h-4" />,
            exact: false,
          },
        ]
      : []),
    {
      name: "My Reviews",
      path: "/dashboard/staff/reviews",
      icon: <Star className="w-4 h-4" />,
      exact: false,
    },
  ];

  const isProfileActive = location.pathname === "/dashboard/staff/profile";

  if (!loading && !currentUser) {
    return <Navigate to="/auth/login" replace />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  if (loading || isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#101010] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E86A33] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isDeactivated) {
    return (
      <div className={theme} data-dashboard-root>
        <div className="min-h-screen bg-[#101010] flex items-center justify-center p-6 text-[#F5F5F5]">
          <div className="max-w-md w-full bg-[#171717] border border-[#2C2C2C] rounded-2xl p-8 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <ShieldOff className="w-6 h-6 text-red-500" />
            </div>
            <h1 className="text-xl font-bold font-display">Your staff account is deactivated</h1>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              You can't view or take jobs right now. Contact the owner if you think this is a mistake.
            </p>
            <button
              onClick={handleConfirmLogout}
              className="mt-2 rounded-lg bg-burnt-orange hover:bg-burnt-orange-dark text-white px-6 py-3 font-semibold transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={theme} data-dashboard-root>
      <div className="min-h-screen bg-[#101010] font-sans flex text-[#F5F5F5] transition-colors duration-300 selection:bg-[#E86A33] selection:text-white relative">

        <DashboardSidebar
          homePath="/dashboard/staff"
          items={navItems}
          onLogout={() => setIsLogoutModalOpen(true)}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-[240px] flex flex-col min-h-screen relative z-10 min-w-0">
          {/* Top Bar */}
          <header className={`${DASHBOARD_BAR_HEIGHT} bg-[#101010]/80 backdrop-blur-md shadow-md border-b border-[#2C2C2C] sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between`}>
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile hamburger button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04] lg:hidden"
                aria-label="Open Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <PageHeading heading={pageHeading} />
            </div>

            {/* Top Navigation Right: Theme Toggle, Notifications, Profile (NO Upgrade button) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {/* Global Theme Toggle */}
                <ThemeToggle size={18} />

                {/* Notifications Bell Dropdown */}
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
                  {bellOpen && <BellDropdown onClose={() => setBellOpen(false)} />}
                </div>

                <ProfileChip
                  name={displayName}
                  photoURL={photoURL}
                  to="/dashboard/staff/profile"
                  active={isProfileActive}
                />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1400px] mx-auto">
              <Outlet context={{ theme }} />
              <StaffUndoBar />
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
