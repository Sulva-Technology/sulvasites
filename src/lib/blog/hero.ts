import type { PageData } from "../pageSchema.ts";
import { postsForTag, tagLabel } from "./blogPath.ts";
import type { BlogData, BlogPost, BlogView } from "./types.ts";

/**
 * The page a template renders above blog content: only its extra-page hero, so every template
 * frames /blog in its own style (title, breadcrumb, header offset).
 */
export function blogHeroPage(blog: BlogData, view: BlogView, post: BlogPost | undefined, businessName: string): PageData {
  let headline = blog.label;
  let subtext = `News, ideas and stories from ${businessName}.`;
  if (view.kind === "tag") {
    headline = tagLabel(blog.posts, view.tag) ?? view.tag;
    const n = postsForTag(blog.posts, view.tag).length;
    subtext = `${n} ${n === 1 ? "post" : "posts"} from ${businessName}.`;
  } else if (post) {
    headline = post.title;
    subtext = post.excerpt;
  }
  return {
    seo: { title: headline, description: subtext },
    sections: [{ type: "hero", headline, subtext, ctaText: "", ctaHref: "" }],
  };
}
