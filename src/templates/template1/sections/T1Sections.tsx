"use client";

import type { PageData } from "@/lib/pageSchema";
import T1BackedBy from "./T1BackedBy";
import T1ContactCard from "./T1ContactCard";
import T1FAQ from "./T1FAQ";
import T1Gallery from "./T1Gallery";
import T1Hero from "./T1Hero";
import T1RichText from "./T1RichText";
import T1Services from "./T1Services";
import T1Team from "./T1Team";
import T1Testimonials from "./T1Testimonials";
import T1UseCases from "./T1UseCases";
import T1Values from "./T1Values";

/** Renders every section type on any page, so sections added in the editor always show. */
export default function T1Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T1Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T1Services key={key} section={section} sectionIndex={i} />;
          case "richtext":
            return <T1RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T1Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T1BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T1UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T1Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T1Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T1Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T1FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T1ContactCard key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
