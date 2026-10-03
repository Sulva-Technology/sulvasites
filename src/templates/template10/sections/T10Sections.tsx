"use client";

import type { PageData } from "@/lib/pageSchema";
import T10BackedBy from "./T10BackedBy";
import T10ContactCard from "./T10ContactCard";
import T10FAQ from "./T10FAQ";
import T10Gallery from "./T10Gallery";
import T10Hero from "./T10Hero";
import T10RichText from "./T10RichText";
import T10Services from "./T10Services";
import T10Team from "./T10Team";
import T10Testimonials from "./T10Testimonials";
import T10UseCases from "./T10UseCases";
import T10Values from "./T10Values";

/** Renders every section type on any page, so sections added in the editor always show. */
export default function T10Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T10Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T10Services key={key} section={section} sectionIndex={i} />;
          case "richtext":
            return <T10RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T10Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T10BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T10UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T10Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T10Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T10Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T10FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T10ContactCard key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
