"use client";

import type { PageData } from "@/lib/pageSchema";
import T8BackedBy from "./T8BackedBy";
import T8ContactCard from "./T8ContactCard";
import T8FAQ from "./T8FAQ";
import T8Gallery from "./T8Gallery";
import T8Hero from "./T8Hero";
import T8RichText from "./T8RichText";
import T8Services from "./T8Services";
import T8Team from "./T8Team";
import T8Testimonials from "./T8Testimonials";
import T8UseCases from "./T8UseCases";
import T8Values from "./T8Values";

/** Renders every section type on any page, so sections added in the editor always show. */
export default function T8Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T8Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T8Services key={key} section={section} sectionIndex={i} />;
          case "richtext":
            return <T8RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T8Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T8BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T8UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T8Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T8Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T8Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T8FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T8ContactCard key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
