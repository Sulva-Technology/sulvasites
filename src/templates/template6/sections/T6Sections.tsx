"use client";

import type { PageData } from "@/lib/pageSchema";
import T6BackedBy from "./T6BackedBy";
import T6ContactCard from "./T6ContactCard";
import T6FAQ from "./T6FAQ";
import T6Gallery from "./T6Gallery";
import T6Hero from "./T6Hero";
import T6RichText from "./T6RichText";
import T6Services from "./T6Services";
import T6Team from "./T6Team";
import T6Testimonials from "./T6Testimonials";
import T6UseCases from "./T6UseCases";
import T6Values from "./T6Values";

/** Renders every section type on any page, so sections added in the editor always show. */
export default function T6Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T6Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T6Services key={key} section={section} sectionIndex={i} />;
          case "richtext":
            return <T6RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T6Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T6BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T6UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T6Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T6Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T6Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T6FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T6ContactCard key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
