import React from 'react';
import { Star, CheckCircle2 } from 'lucide-react';

export default function Membership() {
  return (
    <section id="membership" className={styles.section}>
      <div className={styles.backgroundContainer}>
        <img 
          src="https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=1200" 
          alt="Sleek polished luxury car" 
          className={styles.backgroundImage}
        />
        <div className={styles.gradientOverlayRight}></div>
        <div className={styles.gradientOverlayTop}></div>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.textContent}>
          <h2 className={styles.heading}>WASH MORE.<br/><span className={styles.highlightText}>SAVE MORE.</span></h2>
          <p className={styles.subheading}>
            Join the Veloce Membership for the ultimate convenience. Members receive complimentary house calls, priority booking, and exclusive savings on every detail.
          </p>
          
          <div className={styles.grid}>
            <div className={styles.freeTierCol}>
              <div className={styles.tierTitleOff}>Free Tier</div>
              <ul className={styles.list}>
                <li className={styles.listItem}>
                  <CheckCircle2 className={styles.checkIconDark} />
                  <span className={styles.listTextOff}>Standard service access</span>
                </li>
                <li className={styles.listItem}>
                  <CheckCircle2 className={styles.checkIconDark} />
                  <span className={styles.listTextOff}>House calls (fee applies)</span>
                </li>
                <li className={styles.listItem}>
                  <CheckCircle2 className={styles.checkIconDark} />
                  <span className={styles.listTextOff}>Basic loyalty rewards</span>
                </li>
              </ul>
            </div>
            
            <div className={styles.memberTierCol}>
              <div className={styles.starBadge}>
                <Star className={styles.starIcon} />
              </div>
              <div className={styles.tierTitleOn}>Membership</div>
              <ul className={styles.list}>
                <li className={styles.listItem}>
                  <CheckCircle2 className={styles.checkIconOrange} />
                  <span className={styles.listTextOn}>Free house calls</span>
                </li>
                <li className={styles.listItem}>
                  <CheckCircle2 className={styles.checkIconOrange} />
                  <span className={styles.listTextOn}>Exclusive member discounts</span>
                </li>
                <li className={styles.listItem}>
                  <CheckCircle2 className={styles.checkIconOrange} />
                  <span className={styles.listTextOn}>Priority booking slots</span>
                </li>
                <li className={styles.listItem}>
                  <CheckCircle2 className={styles.checkIconOrange} />
                  <span className={styles.listTextOn}>Accelerated rewards</span>
                </li>
              </ul>
            </div>
          </div>
          
          <button className={styles.button}>
            Become a Member
          </button>
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: "relative py-24 md:py-32 bg-charcoal text-white overflow-hidden",
  backgroundContainer: "absolute inset-0 z-0 flex md:justify-end opacity-20 md:opacity-40",
  backgroundImage: "h-full w-full md:w-1/2 object-cover object-left mix-blend-luminosity grayscale",
  gradientOverlayRight: "absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/80 to-transparent md:to-transparent",
  gradientOverlayTop: "absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent",
  
  contentContainer: "relative z-10 max-w-7xl mx-auto px-6 md:px-12",
  textContent: "max-w-2xl",
  heading: "text-4xl md:text-5xl font-bold mb-6",
  highlightText: "text-burnt-orange",
  subheading: "text-lg text-soft-gray mb-12 max-w-lg",
  
  grid: "grid sm:grid-cols-2 gap-8 mb-12",
  freeTierCol: "space-y-6",
  tierTitleOff: "text-sm font-bold tracking-widest uppercase text-soft-gray mb-4",
  list: "space-y-4",
  listItem: "flex items-start gap-3",
  checkIconDark: "w-5 h-5 text-charcoal-700 shrink-0",
  listTextOff: "text-soft-gray",
  
  memberTierCol: "bg-charcoal-800 p-6 rounded-xl border border-burnt-orange/20 relative shadow-2xl shadow-charcoal-900/50",
  starBadge: "absolute -top-3 -right-3 bg-burnt-orange text-white w-8 h-8 rounded-full flex items-center justify-center",
  starIcon: "w-4 h-4 fill-current",
  tierTitleOn: "text-sm font-bold tracking-widest uppercase text-burnt-orange mb-4",
  checkIconOrange: "w-5 h-5 text-burnt-orange shrink-0",
  listTextOn: "text-white font-medium",
  
  button: "bg-burnt-orange hover:bg-burnt-orange-dark text-white px-8 py-4 rounded font-semibold text-lg transition-colors",
};
