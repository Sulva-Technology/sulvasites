import { createElement, type ReactElement } from "react";

import { BLOG_NAV_KEY, parseBlogPath, postsForTag, relatedPosts } from "@/lib/blog/blogPath";
import { blogHeroPage } from "@/lib/blog/hero";
import { sanitizePostHtml } from "@/lib/blog/sanitize";
import type { CheckoutMode } from "@/lib/shop/checkoutMode";
import { isPageKey } from "@/lib/pageSchema";
import { sampleBlog } from "@/templates/sampleBlog";
import { blogSlot } from "@/templates/shared/blog/blogSlot";
import { getTemplate } from "@/templates/registry";
import { parseShopPath, shopViewExists } from "@/lib/shop/shopPath";
import { templateSupportsShop } from "@/templates/meta";
import { sampleExtraPage, sampleShop, sampleSite } from "@/templates/sampleSite";

/**
 * Renders a template with sample content (no database needed). Returns null for an
 * unknown template or page so the route can 404.
 *   []                 → home
 *   ["about"]          → about
 *   ["p", "work"]      → extra page (template preset, filled with sample sections)
 *   ["shop", ...]      → storefront views (shop templates only; sampleShop data)
 *   ["blog", ...]      → blog list / tag / post (sampleBlog data)
 */
export function renderSampleTemplate(
  key: string,
  page: string[] | undefined,
  baseUrl: string,
  opts: { checkoutMode?: CheckoutMode } = {},
): ReactElement | null {
  const Template = getTemplate(key);
  if (!Template) return null;

  const { blog, bodies } = sampleBlog(key);
  const base = sampleSite(key);
  // Every site gets a blog; it joins the nav like a live site with published posts.
  const props = {
    ...base,
    navPages: [...(base.navPages ?? []), { key: BLOG_NAV_KEY, label: blog.label, href: "/blog" }],
    blog,
  };
  // Shop templates get the sample catalogue on every page (bag, "shop the looks"), like live sites.
  const shopData = templateSupportsShop(key) ? sampleShop(key) : undefined;
  const pageShop =
    shopData && opts.checkoutMode ? { ...shopData, settings: { ...shopData.settings, checkoutMode: opts.checkoutMode } } : shopData;

  if (page?.[0] === "blog") {
    const view = parseBlogPath(page.slice(1));
    if (!view) return null;
    const post = view.kind === "post" ? blog.posts.find((p) => p.slug === view.slug) : undefined;
    if (view.kind === "post" && !post) return null;
    if (view.kind === "tag" && postsForTag(blog.posts, view.tag).length === 0) return null;
    return createElement(Template, {
      ...props,
      currentPage: null,
      baseUrl,
      pageOverride: blogHeroPage(blog, view, post, props.profile.business_name),
      currentExtraKey: BLOG_NAV_KEY,
      shop: pageShop,
      slot: blogSlot({
        blog,
        view,
        post,
        bodyHtml: post ? sanitizePostHtml(bodies[post.slug] ?? "") : undefined,
        related: post ? relatedPosts(blog.posts, post, 3) : undefined,
        baseUrl,
        templateKey: key,
      }),
    });
  }

  if (page?.[0] === "shop") {
    if (!templateSupportsShop(key)) return null;
    const view = parseShopPath(page.slice(1));
    if (!view || !pageShop || !shopViewExists(pageShop, view)) return null;
    return createElement(Template, { ...props, currentPage: null, baseUrl, shop: pageShop, shopView: view });
  }

  if (page?.[0] === "p" && page[1]) {
    const extra = sampleExtraPage(key, props, page[1]);
    if (!extra) return null;
    return createElement(Template, { ...props, currentPage: null, pageOverride: extra, currentExtraKey: page[1], baseUrl, shop: pageShop });
  }

  const pageKey = page?.[0] ?? "home";
  if (!isPageKey(pageKey)) return null;

  return createElement(Template, { ...props, currentPage: pageKey, baseUrl, shop: pageShop });
}
