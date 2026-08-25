import { useState, useEffect } from "react";
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
} from "lucide-react";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import ThemeToggle from "../../../components/ui/ThemeToggle";
import LogoutConfirmationModal from "../../../components/ui/LogoutConfirmationModal";

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
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
      name: "Packages",
      path: "/dashboard/customer/packages",
      icon: <History className="w-4 h-4" />,
    },
    {
      name: "Rewards",
      path: "/dashboard/customer/rewards",
      icon: <Gift className="w-4 h-4" />,
    },
    { name: "Membership", path: "/dashboard/customer/membership", icon: <Star className="w-4 h-4" /> },
    { name: "Contact Us", path: "/dashboard/customer/contact", icon: <MessageSquare className="w-4 h-4" /> },
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

              <div className="flex items-center gap-5">
                {/* Global Theme Toggle */}
                <ThemeToggle size={18} />

                <button className="text-[#71717A] hover:text-[#F5F5F5] transition-colors relative">
                  <Bell className="w-[18px] h-[18px]" />
                  <span className="absolute -top-0.5 -right-0.5 w-[6px] h-[6px] bg-[#E86A33] rounded-full"></span>
                </button>

                <Link
                  to="/dashboard/customer/profile"
                  className="w-8 h-8 rounded-full bg-[#1F1F1F] overflow-hidden border border-[#2C2C2C] hover:border-[#E86A33] transition-colors"
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
