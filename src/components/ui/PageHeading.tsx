import type { PageHeadingDef } from "../../lib/pageHeadings";

/** Page title + description shown in the dashboard top bar. */
export default function PageHeading({ heading }: { heading: PageHeadingDef }) {
  return (
    <div className="min-w-0 mr-6">
      <h1 className="text-[20px] sm:text-[22px] font-bold font-display tracking-tight text-[#F5F5F5] leading-tight truncate">
        {heading.title}
      </h1>
      <p className="hidden sm:block text-[14px] text-[#A1A1AA] leading-snug truncate mt-0.5">{heading.description}</p>
    </div>
  );
}
