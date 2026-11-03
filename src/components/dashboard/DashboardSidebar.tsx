import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { DASHBOARD_BAR_HEIGHT } from "../../lib/pageHeadings";

export interface SidebarItem {
  name: string;
  path: string;
  icon: ReactNode;
  /** Only highlight on this exact path (used for each area's home page) */
  exact?: boolean;
  badge?: number;
}

type DashboardSidebarProps = {
  homePath: string;
  items: SidebarItem[];
  /** Small, quieter links above Log Out (e.g. Contact Us) */
  footerItems?: SidebarItem[];
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function isActive(pathname: string, item: SidebarItem) {
  if (item.exact) return pathname === item.path;
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

/** Sidebar shared by the customer, staff and admin dashboards so all three look and behave the same. */
export default function DashboardSidebar({
  homePath,
  items,
  footerItems = [],
  onLogout,
  mobileOpen,
  onMobileClose,
}: DashboardSidebarProps) {
  const { pathname } = useLocation();
  const { theme } = useTheme();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}

      <aside
        className={`w-[240px] bg-[#171717] border-r border-[#2C2C2C] fixed inset-y-0 left-0 flex flex-col z-40 transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className={`${DASHBOARD_BAR_HEIGHT} flex items-center justify-between px-6 border-b border-[#2C2C2C] shrink-0`}>
          <Link to={homePath} className="flex items-center" onClick={onMobileClose}>
            <img
              src={theme === "light" ? "/images/logo-light.webp" : "/images/logo.webp"}
              alt="WashWizzy"
              className="w-28 h-auto object-contain"
            />
          </Link>
          <button
            onClick={onMobileClose}
            className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" aria-label="Main">
          {items.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3.5 px-[16px] py-[11px] min-h-[46px] rounded-lg transition-all font-medium text-[14px] ${
                  active
                    ? "bg-[rgba(232,106,51,0.10)] text-[#E86A33]"
                    : "text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#F5F5F5]"
                }`}
              >
                <span className="[&>svg]:w-[18px] [&>svg]:h-[18px] shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.name}</span>
                {!!item.badge && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#E86A33] text-white text-[11px] font-bold flex items-center justify-center badge-solid">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-[#2C2C2C] mt-auto space-y-0.5 shrink-0">
          {footerItems.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-[16px] py-2 min-h-[40px] rounded-lg transition-all font-medium text-[13px] ${
                  active
                    ? "bg-[rgba(232,106,51,0.10)] text-[#E86A33]"
                    : "text-[#71717A] hover:bg-white/[0.04] hover:text-[#F5F5F5]"
                }`}
              >
                <span className="[&>svg]:w-4 [&>svg]:h-4 shrink-0">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-[16px] py-2 min-h-[40px] rounded-lg transition-all font-medium text-[13px] text-[#71717A] hover:bg-white/[0.04] hover:text-[#F5F5F5] cursor-pointer"
          >
            <span className="[&>svg]:w-4 [&>svg]:h-4 shrink-0">
              <LogOut />
            </span>
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
