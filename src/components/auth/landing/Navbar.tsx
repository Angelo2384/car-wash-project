import React from "react";
import { Menu, X } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import ThemeToggle from "../../ui/ThemeToggle";

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("home");
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/";

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );

    const sections = [
      "home",
      "services",
      "membership",
      "rewards",
      "how-it-works",
    ];
    sections.forEach((section) => {
      const element = document.getElementById(section);
      if (element) observer.observe(element);
    });

    return () => {
      sections.forEach((section) => {
        const element = document.getElementById(section);
        if (element) observer.unobserve(element);
      });
    };
  }, []);

  const getNavLinkClass = (section: string) => {
    return `${styles.navLink} ${(isHome && activeSection === section) || (!isHome && section === 'about') ? "text-burnt-orange font-bold" : "text-soft-gray"}`;
  };

  const getMobileNavLinkClass = (section: string) => {
    return `${styles.mobileNavLink} ${(isHome && activeSection === section) || (!isHome && section === 'about') ? "text-burnt-orange font-bold" : "text-soft-gray"}`;
  };

  const getHref = (section: string) => {
    if (section === 'about') return '/about';
    return isHome ? `#${section}` : `/#${section}`;
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <div className={styles.innerContainer}>
          <div className={styles.logoGroup}>
            <Link to="/">
              <img
                src="/images/logo.png"
                alt="WashWizzy Logo"
                className={styles.logoImage}
              />
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className={styles.desktopNavGroup}>
            <a href={getHref("home")} className={getNavLinkClass("home")}>
              Home
            </a>
            <a href={getHref("about")} onClick={(e) => { e.preventDefault(); navigate('/about'); }} className={getNavLinkClass("about")}>
              About Us
            </a>
            <a href={getHref("services")} className={getNavLinkClass("services")}>
              Services
            </a>
            <a href={getHref("membership")} className={getNavLinkClass("membership")}>
              Membership
            </a>
            <a href={getHref("rewards")} className={getNavLinkClass("rewards")}>
              Rewards
            </a>
            <a href={getHref("how-it-works")} className={getNavLinkClass("how-it-works")}>
              How It Works
            </a>
          </div>

          <div className={styles.desktopButtonGroup}>
            <ThemeToggle size={18} />
            <button className={styles.signInButton} onClick={() => navigate('/auth/login')}>Sign In</button>
            <button className={styles.getStartedButton} onClick={() => navigate('/auth/signup')}>Get Started</button>
          </div>

          {/* Mobile Toggle */}
          <div className={styles.mobileToggleGroup}>
            <ThemeToggle size={18} className="mr-2" />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={styles.toggleButton}
            >
              {isOpen ? (
                <X className={styles.toggleIcon} />
              ) : (
                <Menu className={styles.toggleIcon} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className={styles.mobileNavContainer}>
          <a
            href={getHref("home")}
            onClick={() => setIsOpen(false)}
            className={getMobileNavLinkClass("home")}
          >
            Home
          </a>
          <a
            href={getHref("about")}
            onClick={(e) => { e.preventDefault(); setIsOpen(false); navigate('/about'); }}
            className={getMobileNavLinkClass("about")}
          >
            About Us
          </a>
          <a
            href={getHref("services")}
            onClick={() => setIsOpen(false)}
            className={getMobileNavLinkClass("services")}
          >
            Services
          </a>
          <a
            href={getHref("membership")}
            onClick={() => setIsOpen(false)}
            className={getMobileNavLinkClass("membership")}
          >
            Membership
          </a>
          <a
            href={getHref("rewards")}
            onClick={() => setIsOpen(false)}
            className={getMobileNavLinkClass("rewards")}
          >
            Rewards
          </a>
          <a
            href={getHref("how-it-works")}
            onClick={() => setIsOpen(false)}
            className={getMobileNavLinkClass("how-it-works")}
          >
            How It Works
          </a>
          <button className={styles.mobileSignInButton} onClick={() => navigate('/auth/login')}>Sign In</button>
          <button className={styles.mobileGetStartedButton} onClick={() => navigate('/auth/signup')}>Get Started</button>
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: "fixed w-full z-50 bg-charcoal/95 backdrop-blur-md border-b border-charcoal-700/50",
  container: "max-w-7xl mx-auto px-6 md:px-12",
  innerContainer: "relative flex justify-between items-center h-20",

  logoGroup: "flex items-center gap-2",
  logoImage: "h-20 w-auto object-contain",

  desktopNavGroup:
    "hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2",
  navLink: "hover:text-burnt-orange transition-colors text-sm font-medium",

  desktopButtonGroup: "hidden md:flex items-center gap-6",
  signInButton:
    "text-soft-gray hover:text-white font-medium text-sm transition-colors",
  getStartedButton:
    "bg-burnt-orange hover:bg-burnt-orange-dark text-white px-6 py-2.5 rounded font-semibold text-sm transition-colors",

  mobileToggleGroup: "md:hidden flex items-center",
  toggleButton: "text-white",
  toggleIcon: "w-6 h-6",

  mobileNavContainer:
    "md:hidden bg-charcoal border-t border-charcoal-700 px-6 py-4 flex flex-col gap-4",
  mobileNavLink:
    "hover:text-burnt-orange text-lg font-medium py-2 transition-colors",
  mobileSignInButton:
    "text-left text-soft-gray hover:text-white font-medium mt-2",
  mobileGetStartedButton:
    "bg-burnt-orange text-white px-4 py-3 rounded font-semibold w-full text-center mt-2",
};
