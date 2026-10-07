"use client";

import type { PageData } from "@/lib/pageSchema";
import T15BackedBy from "./T15BackedBy";
import T15ContactCard from "./T15ContactCard";
import T15FAQ from "./T15FAQ";
import T15Gallery from "./T15Gallery";
import T15Hero from "./T15Hero";
import T15RichText from "./T15RichText";
import T15Services from "./T15Services";
import T15Team from "./T15Team";
import T15Testimonials from "./T15Testimonials";
import T15UseCases from "./T15UseCases";
import T15Values from "./T15Values";

/**
 * Renders every section type on any page, so sections added in the editor always show.
 * Only the first services / collection / enquiry section on a page carries the
 * `#services` / `#collection` / `#enquire` anchor, so ids never repeat.
 */
export default function T15Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );
  const firstServices = sections.findIndex((s) => s.type === "services");
  const firstCollection = sections.findIndex((s) => s.type === "use_cases");
  const firstForm = sections.findIndex((s) => s.type === "contact_card" && s.showForm);
  const firstContact = firstForm >= 0 ? firstForm : sections.findIndex((s) => s.type === "contact_card");

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T15Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T15Services key={key} section={section} sectionIndex={i} anchor={i === firstServices} />;
          case "richtext":
            return <T15RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T15Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T15BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T15UseCases key={key} section={section} sectionIndex={i} anchor={i === firstCollection} />;
          case "testimonials":
            return <T15Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T15Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T15Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T15FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T15ContactCard key={key} section={section} sectionIndex={i} anchor={i === firstContact} />;
          default:
            return null;
        }
      })}
    </>
  );
}
