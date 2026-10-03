"use client";

import type { PageData } from "@/lib/pageSchema";
import T9BackedBy from "./T9BackedBy";
import T9ContactCard from "./T9ContactCard";
import T9FAQ from "./T9FAQ";
import T9Gallery from "./T9Gallery";
import T9Hero from "./T9Hero";
import T9RichText from "./T9RichText";
import T9Services from "./T9Services";
import T9Team from "./T9Team";
import T9Testimonials from "./T9Testimonials";
import T9UseCases from "./T9UseCases";
import T9Values from "./T9Values";

/** Renders every section type on any page, so sections added in the editor always show. */
export default function T9Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T9Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T9Services key={key} section={section} sectionIndex={i} />;
          case "richtext":
            return <T9RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T9Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T9BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T9UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T9Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T9Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T9Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T9FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T9ContactCard key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
