"use client";

import type { PageData } from "@/lib/pageSchema";
import T4BackedBy from "./T4BackedBy";
import T4ContactCard from "./T4ContactCard";
import T4FAQ from "./T4FAQ";
import T4Gallery from "./T4Gallery";
import T4Hero from "./T4Hero";
import T4RichText from "./T4RichText";
import T4Services from "./T4Services";
import T4Team from "./T4Team";
import T4Testimonials from "./T4Testimonials";
import T4UseCases from "./T4UseCases";
import T4Values from "./T4Values";

/** Renders every section type on any page, so sections added in the editor always show. */
export default function T4Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T4Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T4Services key={key} section={section} sectionIndex={i} />;
          case "richtext":
            return <T4RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T4Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T4BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T4UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T4Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T4Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T4Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T4FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T4ContactCard key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
