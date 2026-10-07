import type { ReactNode } from "react";

import type { BlogData, BlogPost, BlogView } from "@/lib/blog/types";
import { BlogArticle, BlogIndex } from "./BlogViews";

/** The blog content a template renders after its hero on /blog routes (live and sample previews). */
export function blogSlot(opts: {
  blog: BlogData;
  view: BlogView;
  post?: BlogPost;
  bodyHtml?: string;
  related?: BlogPost[];
  baseUrl: string;
  templateKey: string;
  canonicalUrl?: string;
}): ReactNode {
  const { blog, view, post, baseUrl, templateKey } = opts;
  if (view.kind === "post") {
    if (!post) return null;
    return (
      <BlogArticle
        post={post}
        bodyHtml={opts.bodyHtml ?? ""}
        related={opts.related ?? []}
        baseUrl={baseUrl}
        templateKey={templateKey}
        label={blog.label}
        canonicalUrl={opts.canonicalUrl}
      />
    );
  }
  return <BlogIndex blog={blog} view={view} baseUrl={baseUrl} templateKey={templateKey} />;
}
