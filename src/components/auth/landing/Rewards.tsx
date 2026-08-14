import React from 'react';
import { Gift, Unlock } from 'lucide-react';

export default function Rewards() {
  return (
    <section id="rewards" className={styles.section}>
      {/* Background accents */}
      <div className={styles.backgroundAccent}></div>
      
      <div className={styles.container}>
        <div className={styles.grid}>
          
          <div>
            <div className={styles.badgeContainer}>
              <Gift className={styles.badgeIcon} />
              Loyalty Program
            </div>
            <h2 className={styles.heading}>Every Wash Counts.</h2>
            <p className={styles.subheading}>
              We reward our regular customers. Track your progress with every wash. Complete 10 washes and unlock an exclusive reward. It's our way of saying thank you for trusting us with your vehicle.
            </p>
            
            <div className={styles.rewardCard}>
              <div className={styles.rewardIconWrapper}>
                <Unlock className={styles.rewardIcon} />
              </div>
              <div>
                <h4 className={styles.rewardTitle}>Current Reward</h4>
                <p className={styles.rewardDesc}>Rewards change periodically. The current unlock is a guaranteed <strong className="text-white">10% OFF your next wash</strong>.</p>
              </div>
            </div>
          </div>
          
          {/* Tracker Visualization */}
          <div className={styles.trackerContainer}>
            
            <div className={styles.trackerHeader}>
              <div>
                <div className={styles.trackerScore}>
                  9 <span className={styles.trackerTotal}>/ 10</span>
                </div>
                <div className={styles.trackerLabel}>Washes Completed</div>
              </div>
              <div className={styles.trackerStatusWrapper}>
                <div className={styles.trackerStatus}>1 Wash away</div>
              </div>
            </div>
            
            <div className={styles.dotsContainer}>
              {[...Array(9)].map((_, i) => (
                <div key={i} className={styles.dotFilled}>
                  <div className={styles.dotInner}></div>
                </div>
              ))}
              <div className={styles.dotEmpty}>
                <div className={styles.dotEmptyOverlay}></div>
              </div>
            </div>
            
            <div className={styles.nextRewardCard}>
              <div className={styles.nextRewardHover}></div>
              <div className={styles.nextRewardLabel}>NEXT REWARD</div>
              <div className={styles.nextRewardValue}>10% OFF NEXT WASH</div>
            </div>
            
          </div>
          
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: "py-24 bg-charcoal-900 text-white border-y border-charcoal-800 relative overflow-hidden",
  backgroundAccent: "absolute top-0 right-0 w-[500px] h-[500px] bg-reward-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2",
  container: "max-w-7xl mx-auto px-6 md:px-12 relative z-10",
  grid: "grid md:grid-cols-2 gap-16 items-center",
  
  badgeContainer: "inline-flex items-center gap-2 px-3 py-1.5 rounded bg-reward-green/10 text-reward-green text-xs font-bold tracking-widest uppercase mb-6",
  badgeIcon: "w-4 h-4",
  heading: "text-3xl md:text-5xl font-bold mb-6",
  subheading: "text-lg text-soft-gray mb-8",
  
  rewardCard: "bg-charcoal-800 border border-charcoal-700 p-6 rounded-xl flex items-start gap-4 mb-8",
  rewardIconWrapper: "w-10 h-10 bg-reward-green/20 rounded-full flex items-center justify-center shrink-0",
  rewardIcon: "w-5 h-5 text-reward-green",
  rewardTitle: "font-bold text-lg mb-1",
  rewardDesc: "text-soft-gray text-sm",
  
  trackerContainer: "bg-charcoal border border-charcoal-700 p-8 md:p-12 rounded-2xl shadow-2xl relative",
  trackerHeader: "flex justify-between items-end mb-8",
  trackerScore: "text-4xl font-display font-bold text-white tracking-tighter",
  trackerTotal: "text-charcoal-700",
  trackerLabel: "text-sm font-bold text-soft-gray uppercase tracking-wider mt-1",
  trackerStatusWrapper: "text-right",
  trackerStatus: "text-sm font-medium text-reward-green bg-reward-green/10 px-3 py-1 rounded",
  
  dotsContainer: "flex flex-wrap gap-3 mb-10",
  dotFilled: "flex-1 min-w-[8%] aspect-square rounded-full bg-reward-green shadow-[0_0_15px_rgba(53,184,107,0.3)] flex items-center justify-center",
  dotInner: "w-2 h-2 rounded-full bg-white/50",
  dotEmpty: "flex-1 min-w-[8%] aspect-square rounded-full bg-charcoal-700 border-2 border-dashed border-charcoal-600 flex items-center justify-center relative overflow-hidden",
  dotEmptyOverlay: "absolute inset-0 bg-gradient-to-tr from-charcoal-600 to-transparent opacity-20",
  
  nextRewardCard: "bg-gradient-to-r from-charcoal-800 to-charcoal-700 p-6 rounded-xl text-center border border-charcoal-600 relative overflow-hidden group",
  nextRewardHover: "absolute inset-0 bg-reward-green opacity-0 group-hover:opacity-5 transition-opacity",
  nextRewardLabel: "text-sm text-soft-gray mb-2 font-medium",
  nextRewardValue: "text-2xl font-bold text-white tracking-tight",
};
