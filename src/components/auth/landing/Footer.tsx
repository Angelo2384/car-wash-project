import React from 'react';
import { Car } from 'lucide-react';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          
          <div className={styles.colLarge}>
            <div className={styles.logoContainer}>
              <div className={styles.logoBox}>
                <Car className={styles.logoIcon} />
              </div>
              <span className={styles.logoText}>VELOCE</span>
            </div>
            <p className={styles.brandDesc}>
              The premium car wash and detailing platform designed for your convenience. We bring the professional shine directly to your door.
            </p>
          </div>
          
          <div className={styles.colSmall}>
            <h4 className={styles.columnTitle}>Platform</h4>
            <ul className={styles.linkList}>
              <li><a href="#services" className={styles.link}>Services</a></li>
              <li><a href="#membership" className={styles.link}>Membership</a></li>
              <li><a href="#rewards" className={styles.link}>Rewards</a></li>
              <li><a href="#how-it-works" className={styles.link}>How It Works</a></li>
            </ul>
          </div>

          <div className={styles.colSmall}>
            <h4 className={styles.columnTitle}>Company</h4>
            <ul className={styles.linkList}>
              <li><a href="#" className={styles.link}>About Us</a></li>
              <li><a href="#" className={styles.link}>Contact</a></li>
              <li><a href="#" className={styles.link}>Careers</a></li>
              <li><a href="#" className={styles.link}>Press</a></li>
            </ul>
          </div>

          <div className={styles.colLarge}>
            <h4 className={styles.columnTitle}>Account</h4>
            <div className={styles.buttonGroup}>
              <button className={styles.buttonSecondary}>
                Sign In
              </button>
              <button className={styles.buttonPrimary}>
                Create Account
              </button>
            </div>
          </div>
          
        </div>
        
        <div className={styles.bottomBar}>
          <p>&copy; {new Date().getFullYear()} Veloce Car Care. All rights reserved.</p>
          <div className={styles.legalLinks}>
            <a href="#" className={styles.link}>Privacy Policy</a>
            <a href="#" className={styles.link}>Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: "bg-charcoal-900 text-soft-gray py-16 border-t border-charcoal-800",
  container: "max-w-7xl mx-auto px-6 md:px-12",
  grid: "grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-12 mb-16",
  
  colLarge: "col-span-2 md:col-span-4",
  logoContainer: "flex items-center gap-2 mb-6",
  logoBox: "w-8 h-8 bg-burnt-orange rounded flex items-center justify-center",
  logoIcon: "text-white w-5 h-5",
  logoText: "font-display font-bold text-xl text-white tracking-wide",
  brandDesc: "text-sm leading-relaxed max-w-xs",
  
  colSmall: "col-span-1 md:col-span-2",
  columnTitle: "text-white font-bold mb-4 uppercase tracking-wider text-xs",
  linkList: "space-y-3 text-sm",
  link: "hover:text-white transition-colors",
  
  buttonGroup: "flex flex-col sm:flex-row gap-3",
  buttonSecondary: "bg-charcoal-800 hover:bg-charcoal-700 text-white px-4 py-2 rounded text-sm transition-colors border border-charcoal-700",
  buttonPrimary: "bg-burnt-orange hover:bg-burnt-orange-dark text-white px-4 py-2 rounded text-sm transition-colors",
  
  bottomBar: "pt-8 border-t border-charcoal-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs",
  legalLinks: "flex items-center gap-6",
};
