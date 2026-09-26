"use client";

import type { PageData } from "@/lib/pageSchema";
import T5BackedBy from "./T5BackedBy";
import T5ContactCard from "./T5ContactCard";
import T5FAQ from "./T5FAQ";
import T5Gallery from "./T5Gallery";
import T5Hero from "./T5Hero";
import T5RichText from "./T5RichText";
import T5Services from "./T5Services";
import T5Team from "./T5Team";
import T5Testimonials from "./T5Testimonials";
import T5UseCases from "./T5UseCases";
import T5Values from "./T5Values";

/** Renders every section type on any page, so sections added in the editor always show. */
export default function T5Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T5Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T5Services key={key} section={section} sectionIndex={i} />;
          case "richtext":
            return <T5RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T5Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T5BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T5UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T5Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T5Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T5Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T5FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T5ContactCard key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
