"use client";

import type { PageData } from "@/lib/pageSchema";
import T12BackedBy from "./T12BackedBy";
import T12ContactCard from "./T12ContactCard";
import T12FAQ from "./T12FAQ";
import T12Gallery from "./T12Gallery";
import T12Hero from "./T12Hero";
import T12RichText from "./T12RichText";
import T12Services from "./T12Services";
import T12Team from "./T12Team";
import T12Testimonials from "./T12Testimonials";
import T12UseCases from "./T12UseCases";
import T12Values from "./T12Values";

/**
 * Renders every section type on any page, so sections added in the editor always show.
 * Only the first services / quote-form section on a page carries the `#services` / `#quote`
 * anchor, so ids never repeat when a section type appears twice.
 */
export default function T12Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );
  const firstServices = sections.findIndex((s) => s.type === "services");
  const firstForm = sections.findIndex((s) => s.type === "contact_card" && s.showForm);
  const firstContact = firstForm >= 0 ? firstForm : sections.findIndex((s) => s.type === "contact_card");

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T12Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T12Services key={key} section={section} sectionIndex={i} anchor={i === firstServices} />;
          case "richtext":
            return <T12RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T12Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T12BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T12UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T12Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T12Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T12Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T12FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T12ContactCard key={key} section={section} sectionIndex={i} anchor={i === firstContact} />;
          default:
            return null;
        }
      })}
    </>
  );
}
