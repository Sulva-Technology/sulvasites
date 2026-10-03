"use client";

import type { PageData } from "@/lib/pageSchema";
import T7BackedBy from "./T7BackedBy";
import T7ContactCard from "./T7ContactCard";
import T7FAQ from "./T7FAQ";
import T7Gallery from "./T7Gallery";
import T7Hero from "./T7Hero";
import T7RichText from "./T7RichText";
import T7Services from "./T7Services";
import T7Team from "./T7Team";
import T7Testimonials from "./T7Testimonials";
import T7UseCases from "./T7UseCases";
import T7Values from "./T7Values";

/** Renders every section type on any page, so sections added in the editor always show. */
export default function T7Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T7Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T7Services key={key} section={section} sectionIndex={i} />;
          case "richtext":
            return <T7RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T7Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T7BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T7UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T7Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T7Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T7Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T7FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T7ContactCard key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
