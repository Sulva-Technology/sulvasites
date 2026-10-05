import type { TourContext, TourDef } from "./types.ts";

function siteBase(ctx: TourContext): string | null {
  const id = ctx.siteId ?? ctx.firstSiteId;
  return id ? `/dashboard/${id}` : null;
}

const hasTab = (tab: string) => (ctx: TourContext) => Boolean(ctx.tabs?.includes(tab));

const onSite = { route: siteBase, routePrefix: true };

export const ownerTour: TourDef = {
  id: "owner",
  autoStart: (pathname) => {
    const parts = pathname.split("/").filter(Boolean);
    return parts[0] === "dashboard" && parts.length <= 2;
  },
  steps: [
    {
      id: "welcome",
      title: "Welcome to your back office",
      body: "This quick tour shows where everything lives. It takes about a minute, and you can replay it anytime.",
    },
    {
      id: "pick-site",
      target: "site-cards",
      route: (ctx) => (ctx.siteId ? null : "/dashboard"),
      when: (ctx) => (ctx.siteCount ?? 0) > 1,
      title: "Your sites",
      body: "Each card is a website you help run. Open one to manage it. For this tour we'll open the first one.",
    },
    {
      id: "status",
      target: "site-status",
      ...onSite,
      title: "Draft or published",
      body: "This shows whether your site is live. Published means visitors can see it. Draft means it is still private.",
    },
    {
      id: "tabs",
      target: "site-tabs",
      ...onSite,
      title: "Your sections",
      body: "Everything for this site is grouped into these tabs. Here's what each one does.",
    },
    {
      id: "content",
      target: "tab-content",
      ...onSite,
      when: hasTab("content"),
      title: "Content",
      body: "Edit the words and pictures on your pages. Save a draft, preview it, then publish when you're happy.",
    },
    {
      id: "inbox",
      target: "tab-inbox",
      ...onSite,
      when: hasTab("inbox"),
      title: "Inbox",
      body: "Enquiries, bookings and messages from your website arrive here. The number shows how many are new.",
    },
    {
      id: "business",
      target: "tab-business",
      ...onSite,
      when: hasTab("business"),
      title: "Business",
      body: "Keep your business details current: menus, timetables, services and more. Changes show on your site.",
    },
    {
      id: "shop",
      target: "tab-shop",
      ...onSite,
      when: hasTab("shop"),
      title: "Shop",
      body: "Add products, set prices and stock, and follow up on orders.",
    },
    {
      id: "insights",
      target: "tab-insights",
      ...onSite,
      when: hasTab("insights"),
      title: "Insights",
      body: "See how many people visit, which pages they read and where they come from.",
    },
    {
      id: "team",
      target: "tab-team",
      ...onSite,
      when: hasTab("team"),
      title: "Team",
      body: "Give your staff their own logins so they can help with the inbox and business details.",
    },
    {
      id: "replay",
      target: "tour-button",
      title: "Replay anytime",
      body: "Click Tour whenever you need a refresher.",
    },
  ],
};
