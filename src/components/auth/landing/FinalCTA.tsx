import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <div className={styles.backgroundContainer}>
        <img
          src="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=2940"
          alt="Gleaming car at dusk"
          className={styles.backgroundImage}
        />
        <div className={styles.gradientOverlayTop}></div>
        <div className={styles.gradientOverlayRight}></div>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.textContent}>
          <h2 className={styles.heading}>
            Ready for a Better
            <br />
            Car Wash Experience?
          </h2>
          <p className={styles.subheading}>
            Create an account today. Book your first house call and start
            earning rewards immediately.
          </p>
          <div className={styles.buttonGroup}>
            <button className={styles.primaryButton} onClick={() => navigate('/auth/signup')}>
              Create an Account
              <ArrowRight className={styles.buttonIcon} />
            </button>
            <button className={styles.secondaryButton} onClick={() => navigate('/auth/login')}>Sign In</button>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: "py-24 md:py-32 bg-charcoal text-white relative overflow-hidden",
  backgroundContainer: "absolute inset-0 z-0",
  backgroundImage: "w-full h-full object-cover opacity-30 mix-blend-luminosity",
  gradientOverlayTop:
    "absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/80 to-transparent",
  gradientOverlayRight:
    "absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/90 to-transparent",
  contentContainer:
    "relative z-10 max-w-7xl mx-auto px-6 md:px-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-12",
  textContent: "max-w-2xl",
  heading: "text-4xl md:text-5xl font-bold mb-6",
  subheading: "text-xl text-soft-gray mb-8",
  buttonGroup:
    "flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start",
  primaryButton:
    "w-full sm:w-auto bg-burnt-orange hover:bg-burnt-orange-dark text-white px-8 py-4 rounded font-semibold flex items-center justify-center gap-2 transition-all text-lg group",
  buttonIcon: "w-5 h-5 group-hover:translate-x-1 transition-transform",
  secondaryButton:
    "w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded font-semibold flex items-center justify-center transition-all backdrop-blur-sm text-lg",
};
