import React from "react";
import { MapPin, DollarSign, Gift, Zap, Smartphone } from "lucide-react";

export default function WhatMakesUsDifferent() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Redefining Car Care.</h2>
          <p className={styles.subtitle}>
            We've built a platform designed entirely around your convenience,
            rewarding loyalty, and delivering uncompromising quality every
            single time.
          </p>
        </div>

        <div className={styles.grid}>
          {/* Large Featured Block */}
          <div className={styles.largeBlock}>
            <div className={styles.largeBlockBgImage}>
              <img
                src="https://images.unsplash.com/photo-1552930294-6b595f4c2974?auto=format&fit=crop&q=80&w=1200"
                alt="Detailing reflection"
                className={styles.image}
              />
            </div>
            <div className={styles.largeBlockGradient}></div>

            <div className={styles.largeBlockContent}>
              <div className={styles.iconWrapperOrange}>
                <MapPin className={styles.iconWhite} />
              </div>
              <h3 className={styles.blockTitleLarge}>We Come To You</h3>
              <p className={styles.blockDescLarge}>
                Professional car care wherever you are. Your driveway, your
                office lot, or anywhere in between.
              </p>
            </div>
          </div>

          {/* Medium Block */}
          <div className={styles.mediumBlockHoverOrange}>
            <div className={styles.iconWrapperLightOrangeHover}>
              <DollarSign className={styles.iconDarkToOrange} />
            </div>
            <h3 className={styles.blockTitleMedium}>Membership Savings</h3>
            <p className={styles.blockDescMedium}>
              Save more if you regularly use the service with exclusive
              discounts and free house calls.
            </p>
          </div>

          {/* Medium Block */}
          <div className={styles.mediumBlockHoverGreen}>
            <div className={styles.iconWrapperLightGreenHover}>
              <Gift className={styles.iconDarkToGreen} />
            </div>
            <h3 className={styles.blockTitleMedium}>Loyalty Rewards</h3>
            <p className={styles.blockDescMedium}>
              Every wash gets you closer to a reward. Your loyalty directly
              translates to savings.
            </p>
          </div>

          {/* Medium Block */}
          <div className={styles.mediumBlockDark}>
            <div className={styles.iconWrapperDark}>
              <Zap className={styles.iconOrange} />
            </div>
            <h3 className={styles.blockTitleMedium}>Flexible Service</h3>
            <p className={styles.blockDescMediumLight}>
              Choose the ultimate convenience of a house call or visit our
              physical location for a premium wash.
            </p>
          </div>

          {/* Medium Block */}
          <div className={styles.mediumBlockOrange}>
            <div className={styles.iconWrapperTransparent}>
              <Smartphone className={styles.iconWhite} />
            </div>
            <h3 className={styles.blockTitleMedium}>
              Simple Digital Experience
            </h3>
            <p className={styles.blockDescMediumWhite}>
              Request, manage, and track your service seamlessly through our
              modern platform.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: "py-24 bg-off-white text-charcoal overflow-hidden",
  container: "max-w-7xl mx-auto px-6 md:px-12",
  header: "mb-16 max-w-2xl",
  title: "text-3xl md:text-5xl font-bold mb-6",
  subtitle: "text-lg text-charcoal-700",
  grid: "grid md:grid-cols-12 gap-6 md:auto-rows-[300px]",

  largeBlock:
    "md:col-span-8 bg-charcoal text-white p-10 rounded-2xl relative overflow-hidden group",
  largeBlockBgImage:
    "absolute inset-0 opacity-40 mix-blend-overlay transition-transform duration-700 group-hover:scale-105",
  image: "w-full h-full object-cover",
  largeBlockGradient:
    "absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/80 to-transparent",
  largeBlockContent: "relative z-10 h-full flex flex-col justify-end",
  iconWrapperOrange:
    "w-12 h-12 bg-burnt-orange rounded-xl flex items-center justify-center mb-6",
  iconWhite: "w-6 h-6 text-white",
  blockTitleLarge: "text-3xl font-bold mb-3",
  blockDescLarge: "text-soft-gray text-lg max-w-md",

  mediumBlockHoverOrange:
    "md:col-span-4 bg-white border border-soft-gray p-10 rounded-2xl flex flex-col justify-end group hover:border-burnt-orange transition-colors",
  iconWrapperLightOrangeHover:
    "w-12 h-12 bg-off-white rounded-xl flex items-center justify-center mb-6 group-hover:bg-burnt-orange/10 transition-colors",
  iconDarkToOrange:
    "w-6 h-6 text-charcoal group-hover:text-burnt-orange transition-colors",

  mediumBlockHoverGreen:
    "md:col-span-4 bg-white border border-soft-gray p-10 rounded-2xl flex flex-col justify-end group hover:border-reward-green transition-colors",
  iconWrapperLightGreenHover:
    "w-12 h-12 bg-off-white rounded-xl flex items-center justify-center mb-6 group-hover:bg-reward-green/10 transition-colors",
  iconDarkToGreen:
    "w-6 h-6 text-charcoal group-hover:text-reward-green transition-colors",

  blockTitleMedium: "text-2xl font-bold mb-3",
  blockDescMedium: "text-charcoal-700",

  mediumBlockDark:
    "md:col-span-4 bg-charcoal-800 text-white p-10 rounded-2xl flex flex-col justify-end",
  iconWrapperDark:
    "w-12 h-12 bg-charcoal-700 rounded-xl flex items-center justify-center mb-6",
  iconOrange: "w-6 h-6 text-burnt-orange",
  blockDescMediumLight: "text-soft-gray",

  mediumBlockOrange:
    "md:col-span-4 bg-burnt-orange text-white p-10 rounded-2xl flex flex-col justify-end",
  iconWrapperTransparent:
    "w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6",
  blockDescMediumWhite: "text-white/90",
};
