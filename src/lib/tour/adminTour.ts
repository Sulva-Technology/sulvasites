import type { TourContext, TourDef } from "./types.ts";

const site = (suffix = "") => (ctx: TourContext) => (ctx.firstSiteId ? `/admin/sites/${ctx.firstSiteId}${suffix}` : null);

export const adminTour: TourDef = {
  id: "admin",
  autoStart: (pathname) => pathname === "/admin/sites",
  steps: [
    {
      id: "welcome",
      title: "Welcome to Sulva Sites",
      body: "A short tour of building and running client sites, including the AI tools that do most of the heavy lifting.",
    },
    {
      id: "sites-list",
      target: "sites-list",
      route: () => "/admin/sites",
      title: "All client sites",
      body: "Every site you've built lives here. Search, filter by Live or Draft, and open one to manage it.",
    },
    {
      id: "users",
      target: "nav-users",
      title: "Users",
      body: "Create owner and staff logins for clients. New accounts must change their temporary password when they first sign in.",
    },
    {
      id: "new-site",
      target: "new-site",
      title: "Start a new site",
      body: "Build a site from scratch, with the AI assistant or by hand.",
    },
    {
      id: "assistant-mode",
      target: "assistant-mode",
      route: () => "/admin/sites/new",
      title: "Assistant or manual",
      body: "Pick Assistant to let AI build the site for you, or Manual setup to choose the template and fill in details yourself.",
    },
    {
      id: "assistant-chat",
      target: "assistant-chat",
      route: () => "/admin/sites/new",
      title: "Describe the business",
      body: "Tell the assistant the business name, what it does and where it is. One message is enough. Then add a logo, colours and photos, and it builds the whole site.",
    },
    {
      id: "ai-content",
      target: "ai-content",
      route: site("?view=settings"),
      title: "AI content generator",
      body: "Rewrites the copy for every page from the business brief. Review it, then publish when it reads right.",
    },
    {
      id: "ai-seo-all",
      target: "ai-seo-all",
      route: site("?view=settings"),
      title: "AI SEO for all pages",
      body: "Writes page titles, descriptions and image alt text across the whole site in one go.",
    },
    {
      id: "ai-seo-page",
      title: "AI on a single page",
      body: "Inside any page editor, the \"AI: improve SEO & alt text\" button does the same for one page. Click Save Draft afterwards to keep the results.",
    },
    {
      id: "site-tabs",
      target: "site-tabs",
      route: site(),
      title: "Site sections",
      body: "Pages, business data, inbox, insights, shop and settings for this site all live in these tabs.",
    },
    {
      id: "replay",
      target: "tour-button",
      title: "Replay anytime",
      body: "Click Tour whenever you need a refresher.",
    },
  ],
};
