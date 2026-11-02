/**
 * Dashboard page titles. Pages don't render their own title; each layout keeps a
 * list of headings for its routes and shows the matching one in the top bar.
 */

export type PageHeadingDef = { path: string; title: string; description: string };

/** Height shared by the top bar and the sidebar's logo area so their borders line up. */
export const DASHBOARD_BAR_HEIGHT = "h-[72px]";

/**
 * Finds the heading for a route. `path` is relative to `basePath`; "" is the index page.
 * List specific paths before their parents (e.g. "appointments/cancel" before "appointments").
 */
export function findPageHeading(pathname: string, basePath: string, headings: PageHeadingDef[]): PageHeadingDef {
  const sub = pathname.replace(basePath, "").replace(/^\/|\/$/g, "");
  return (
    headings.find((h) => h.path && (sub === h.path || sub.startsWith(`${h.path}/`))) ??
    headings.find((h) => h.path === "") ??
    headings[0]
  );
}
