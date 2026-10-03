"use client";

import type { PageData } from "@/lib/pageSchema";
import T11BackedBy from "./T11BackedBy";
import T11ContactCard from "./T11ContactCard";
import T11FAQ from "./T11FAQ";
import T11Gallery from "./T11Gallery";
import T11Hero from "./T11Hero";
import T11RichText from "./T11RichText";
import T11Services from "./T11Services";
import T11Team from "./T11Team";
import T11Testimonials from "./T11Testimonials";
import T11UseCases from "./T11UseCases";
import T11Values from "./T11Values";

/** Renders every section type on any page, so sections added in the editor always show. */
export default function T11Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T11Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T11Services key={key} section={section} sectionIndex={i} />;
          case "richtext":
            return <T11RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T11Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T11BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T11UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T11Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T11Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T11Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T11FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T11ContactCard key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
