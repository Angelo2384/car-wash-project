import { ArrowRight, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section id="home" className={styles.section}>
      <div className={styles.backgroundContainer}>
        <img
          src={`/images/main3.webp`}
          alt="Professional car detailing in a modern driveway"
          className={styles.backgroundImage}
        />
        <div className={styles.gradientOverlayRight}></div>
        <div className={styles.gradientOverlayTop}></div>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.textContent}>
          <h1 className={styles.heading}>
            Your Car.
            <br />
            Your Location.
            <br />
            <span className={styles.highlightText}>Our Wash.</span>
          </h1>

          <p className={styles.subheading}>
            Experience professional car care without the wait. Request a premium
            wash at your home, workplace, or preferred location, or visit our
            physical facility.
          </p>

          <div className={styles.buttonGroup}>
            <button className={styles.primaryButton} onClick={() => navigate('/auth/signup')}>
              Request a Wash
              <ArrowRight className={styles.buttonIcon} />
            </button>
            <a href="#membership" className={styles.secondaryButton}>
              Explore Membership
            </a>
          </div>

          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <MapPin className={styles.featureIcon} />
              <span>We come to you</span>
            </div>
            <div className={styles.featureDivider}></div>
            <div className={styles.featureItem}>
              <svg
                className={styles.featureIcon}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>Top-rated professionals</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  section:
    "relative pt-36 pb-14 md:pt-44 md:pb-20 overflow-hidden bg-charcoal text-white",
  backgroundContainer: "absolute inset-0 z-0",
  backgroundImage: "w-full h-full object-cover object-[50%_30%] opacity-40 mix-blend-overlay",
  gradientOverlayRight:
    "absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/80 to-transparent",
  gradientOverlayTop:
    "absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent",
  contentContainer: "relative z-10 max-w-7xl mx-auto px-6 md:px-12",
  textContent: "max-w-3xl",
  heading: "text-5xl md:text-7xl font-bold leading-[1.1] mb-6",
  highlightText: "text-burnt-orange",
  subheading:
    "text-lg md:text-xl text-soft-gray mb-10 max-w-xl leading-relaxed",
  buttonGroup: "flex flex-col sm:flex-row gap-4",
  primaryButton:
    "bg-burnt-orange hover:bg-burnt-orange-dark text-white px-8 py-4 rounded font-semibold flex items-center justify-center gap-2 transition-all group text-lg",
  buttonIcon: "w-5 h-5 group-hover:translate-x-1 transition-transform",
  secondaryButton:
    "bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded font-semibold flex items-center justify-center gap-2 transition-all backdrop-blur-sm text-lg",
  featuresList:
    "mt-12 flex items-center gap-6 text-soft-gray text-sm font-medium",
  featureItem: "flex items-center gap-2",
  featureIcon: "w-4 h-4 text-burnt-orange",
  featureDivider: "w-1 h-1 rounded-full bg-soft-gray/50",
};
