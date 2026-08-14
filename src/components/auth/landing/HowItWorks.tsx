export default function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>The Process</h2>
          <p className={styles.subtitle}>
            Three simple steps to a pristine vehicle.
          </p>
        </div>

        <div className={styles.grid}>
          {/* Connecting Line */}
          <div className={styles.connectingLine}></div>

          {/* Step 1 */}
          <div className={styles.stepContainer}>
            <div className={styles.stepCircleOffWhite}>
              <span className={styles.stepNumberDark}>01</span>
            </div>
            <h3 className={styles.stepTitle}>Request</h3>
            <p className={styles.stepDesc}>
              Choose your service package and tell us where you want it; your
              driveway, office, or our facility.
            </p>
          </div>

          {/* Step 2 */}
          <div className={styles.stepContainer}>
            <div className={styles.stepCircleCharcoal}>
              <span className={styles.stepNumberLight}>02</span>
            </div>
            <h3 className={styles.stepTitle}>We Wash</h3>
            <p className={styles.stepDesc}>
              Our professionals execute a meticulous clean using premium
              products and techniques.
             </p>
          </div>

          {/* Step 3 */}
          <div className={styles.stepContainer}>
            <div className={styles.stepCircleOrange}>
              <span className={styles.stepNumberLight}>03</span>
            </div>
            <h3 className={styles.stepTitle}>Earn & Save</h3>
            <p className={styles.stepDesc}>
              Enjoy your clean car and earn rewards automatically, especially if
              you're a WashWizzy Member.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: "py-24 bg-white text-charcoal",
  container: "max-w-7xl mx-auto px-6 md:px-12",
  header: "text-center mb-20",
  title: "text-3xl md:text-4xl font-bold mb-4",
  subtitle: "text-charcoal-700 text-lg",
  grid: "grid md:grid-cols-3 gap-12 relative",
  connectingLine:
    "hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-soft-gray z-0",

  stepContainer: "relative z-10 flex flex-col items-center text-center",
  stepTitle: "text-2xl font-bold mb-4",
  stepDesc: "text-charcoal-700 max-w-xs",

  stepCircleOffWhite:
    "w-24 h-24 bg-off-white rounded-full flex items-center justify-center mb-8 border-[8px] border-white shadow-sm",
  stepCircleCharcoal:
    "w-24 h-24 bg-charcoal text-white rounded-full flex items-center justify-center mb-8 border-[8px] border-white shadow-sm",
  stepCircleOrange:
    "w-24 h-24 bg-burnt-orange text-white rounded-full flex items-center justify-center mb-8 border-[8px] border-white shadow-sm",

  stepNumberDark:
    "font-display text-4xl font-bold text-charcoal tracking-tighter",
  stepNumberLight: "font-display text-4xl font-bold tracking-tighter",
};
