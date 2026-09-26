"use client";

import type { PageData } from "@/lib/pageSchema";
import T2BackedBy from "./T2BackedBy";
import T2ContactCard from "./T2ContactCard";
import T2FAQ from "./T2FAQ";
import T2Gallery from "./T2Gallery";
import T2Hero from "./T2Hero";
import T2RichText from "./T2RichText";
import T2Services from "./T2Services";
import T2Team from "./T2Team";
import T2Testimonials from "./T2Testimonials";
import T2UseCases from "./T2UseCases";
import T2Values from "./T2Values";

/** Renders every section type on any page, so sections added in the editor always show. */
export default function T2Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T2Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T2Services key={key} section={section} sectionIndex={i} />;
          case "richtext":
            return <T2RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T2Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T2BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T2UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T2Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T2Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T2Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T2FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T2ContactCard key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
