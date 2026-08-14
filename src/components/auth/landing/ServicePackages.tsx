import React from "react";
import { Check } from "lucide-react";

const packages = [
  {
    name: "Express Exterior",
    price: "$35",
    description:
      "A fast, high-quality exterior clean to keep your vehicle looking fresh.",
    features: [
      "Hand wash and dry",
      "Wheel and tire cleaning",
      "Tire shine application",
      "Exterior window cleaning",
    ],
    highlighted: false,
  },
  {
    name: "Premium Signature",
    price: "$85",
    description: "Our most popular package. A thorough clean inside and out.",
    features: [
      "Everything in Express Exterior",
      "Interior vacuuming",
      "Dashboard and console wipe down",
      "Interior window cleaning",
      "Door jamb cleaning",
      "Spray wax finish",
    ],
    highlighted: true,
  },
  {
    name: "Ultimate Detail",
    price: "$195",
    description:
      "The complete showroom reset. Deep cleaning and protection for every surface.",
    features: [
      "Everything in Premium Signature",
      "Carpet and seat extraction",
      "Leather conditioning",
      "Clay bar treatment",
      "Premium ceramic sealant",
      "Engine bay detail",
    ],
    highlighted: false,
  },
];

export default function ServicePackages() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.title}>Professional Service Packages</h2>
            <p className={styles.subtitle}>
              Transparent pricing for premium results. Select the level of care
              your vehicle needs today.
            </p>
          </div>
          <p className={styles.pricingDisclaimer}>Prices starting at</p>
        </div>

        <div className={styles.grid}>
          {packages.map((pkg, idx) => (
            <div
              key={idx}
              className={
                pkg.highlighted ? styles.cardHighlighted : styles.cardNormal
              }
            >
              {pkg.highlighted && (
                <div className={styles.popularBadge}>Most Popular</div>
              )}

              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{pkg.name}</h3>
                <p
                  className={
                    pkg.highlighted
                      ? styles.cardDescHighlighted
                      : styles.cardDescNormal
                  }
                >
                  {pkg.description}
                </p>
              </div>

              <div className={styles.priceContainer}>
                <span className={styles.price}>{pkg.price}</span>
              </div>

              <ul className={styles.featuresList}>
                {pkg.features.map((feature, fIdx) => (
                  <li key={fIdx} className={styles.featureItem}>
                    <Check
                      className={
                        pkg.highlighted
                          ? styles.checkIconHighlighted
                          : styles.checkIconNormal
                      }
                    />
                    <span
                      className={
                        pkg.highlighted
                          ? styles.featureTextHighlighted
                          : styles.featureTextNormal
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={
                  pkg.highlighted
                    ? styles.buttonHighlighted
                    : styles.buttonNormal
                }
              >
                Select Package
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: "py-24 bg-white text-charcoal",
  container: "max-w-7xl mx-auto px-6 md:px-12",
  header: "flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6",
  titleWrapper: "max-w-2xl",
  title: "text-3xl md:text-4xl font-bold mb-4",
  subtitle: "text-charcoal-700 text-lg",
  pricingDisclaimer:
    "text-sm font-medium text-charcoal-700 uppercase tracking-wider",
  grid: "grid md:grid-cols-3 gap-8",

  cardNormal:
    "relative flex flex-col p-8 rounded-xl bg-off-white text-charcoal border border-soft-gray/50",
  cardHighlighted:
    "relative flex flex-col p-8 rounded-xl bg-charcoal text-white shadow-2xl scale-105 z-10 border border-charcoal-700",

  popularBadge:
    "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-burnt-orange text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase",

  cardHeader: "mb-8",
  cardTitle: "text-2xl font-bold mb-2",
  cardDescNormal: "text-sm text-charcoal-700",
  cardDescHighlighted: "text-sm text-soft-gray",

  priceContainer: "mb-8",
  price: "text-4xl font-bold",

  featuresList: "flex-grow space-y-4 mb-8",
  featureItem: "flex items-start gap-3 text-sm font-medium",
  checkIconNormal: "w-5 h-5 shrink-0 text-charcoal-900",
  checkIconHighlighted: "w-5 h-5 shrink-0 text-burnt-orange",
  featureTextNormal: "text-charcoal-800",
  featureTextHighlighted: "text-white",

  buttonNormal:
    "w-full py-4 rounded font-semibold transition-colors bg-charcoal hover:bg-charcoal-900 text-white",
  buttonHighlighted:
    "w-full py-4 rounded font-semibold transition-colors bg-burnt-orange hover:bg-burnt-orange-dark text-white",
};
