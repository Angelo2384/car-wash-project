import React from "react";
import { Home, Store } from "lucide-react";

export default function WhatWeOffer() {
  return (
    <section id="services" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Flexible Service, Uncompromising Quality
          </h2>
          <p className={styles.subtitle}>
            Choose how you want to experience our professional car care. Both
            options deliver the same premium results.
          </p>
        </div>

        <div className={styles.grid}>
          {/* We Come To You */}
          <div className={styles.card}>
            <div className={styles.cardBackground}>
              <img
                src="https://images.unsplash.com/photo-1550346062-8ceb11565159?auto=format&fit=crop&q=80&w=1200"
                alt="Mobile car detailing service"
                className={styles.cardImage1}
              />
              <div className={styles.gradientOverlay}></div>
            </div>

            <div className={styles.cardContent}>
              <div className={styles.iconWrapper1}>
                <Home className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>We Come To You</h3>
              <p className={styles.cardDesc}>
                Professional care at your home or workplace. Ultimate
                convenience for your busy schedule.
              </p>
              <div className={styles.badge1}>
                <span className={styles.badgeText1}>
                  Small house-call fee applies for non-members
                </span>
              </div>
            </div>
          </div>

          {/* You Come To Us */}
          <div className={styles.cardAlt}>
            <div className={styles.cardBackground}>
              <img
                src="https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=1200"
                alt="Premium car wash facility"
                className={styles.cardImage2}
              />
              <div className={styles.gradientOverlay}></div>
            </div>

            <div className={styles.cardContent}>
              <div className={styles.iconWrapper2}>
                <Store className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>You Come To Us</h3>
              <p className={styles.cardDesc}>
                Visit our state-of-the-art facility for the traditional premium
                wash experience.
              </p>
              <div className={styles.badge2}>Standard facility rates apply</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: "py-24 bg-off-white text-charcoal",
  container: "max-w-7xl mx-auto px-6 md:px-12",
  header: "text-center max-w-2xl mx-auto mb-16",
  title: "text-3xl md:text-4xl font-bold mb-4",
  subtitle: "text-charcoal-700 text-lg",
  grid: "grid md:grid-cols-2 gap-8",

  card: "group relative overflow-hidden rounded-2xl bg-charcoal text-white h-[500px] flex flex-col justify-end p-8",
  cardAlt:
    "group relative overflow-hidden rounded-2xl bg-charcoal-800 text-white h-[500px] flex flex-col justify-end p-8",

  cardBackground: "absolute inset-0 z-0",
  cardImage1:
    "w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700",
  cardImage2:
    "w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700 grayscale mix-blend-luminosity",
  gradientOverlay:
    "absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal/50 to-transparent",

  cardContent: "relative z-10",
  iconWrapper1:
    "w-12 h-12 bg-burnt-orange rounded-xl flex items-center justify-center mb-6",
  iconWrapper2:
    "w-12 h-12 bg-charcoal-700 rounded-xl flex items-center justify-center mb-6 border border-charcoal-700",
  icon: "w-6 h-6 text-white",
  cardTitle: "text-3xl font-bold mb-3",
  cardDesc: "text-soft-gray mb-6 text-lg max-w-sm",

  badge1:
    "inline-flex items-center gap-2 px-4 py-2 rounded bg-white/10 backdrop-blur-sm border border-white/10 text-sm font-medium",
  badgeText1: "text-burnt-orange",
  badge2:
    "inline-flex items-center gap-2 px-4 py-2 rounded bg-charcoal-700/80 backdrop-blur-sm border border-charcoal-700 text-sm font-medium text-soft-gray",
};
