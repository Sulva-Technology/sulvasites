"use client";

import type { PageData } from "@/lib/pageSchema";
import T16BackedBy from "./T16BackedBy";
import T16ContactCard from "./T16ContactCard";
import T16FAQ from "./T16FAQ";
import T16Gallery from "./T16Gallery";
import T16Hero from "./T16Hero";
import T16RichText from "./T16RichText";
import T16Services from "./T16Services";
import T16Team from "./T16Team";
import T16Testimonials from "./T16Testimonials";
import T16UseCases from "./T16UseCases";
import T16Values from "./T16Values";

/**
 * Renders every section type on any page, so sections added in the editor always show.
 * Only the first services / communities / join section on a page carries the
 * `#departments` / `#communities` / `#join` anchor, so ids never repeat.
 */
export default function T16Sections({ pageData }: { pageData: PageData }) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );
  const firstServices = sections.findIndex((s) => s.type === "services");
  const firstCircles = sections.findIndex((s) => s.type === "use_cases");
  const firstForm = sections.findIndex((s) => s.type === "contact_card" && s.showForm);
  const firstContact = firstForm >= 0 ? firstForm : sections.findIndex((s) => s.type === "contact_card");

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return <T16Hero key={key} section={section} sectionIndex={i} primary={i === 0} />;
          case "services":
            return <T16Services key={key} section={section} sectionIndex={i} anchor={i === firstServices} />;
          case "richtext":
            return <T16RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T16Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T16BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T16UseCases key={key} section={section} sectionIndex={i} anchor={i === firstCircles} />;
          case "testimonials":
            return <T16Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T16Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T16Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T16FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T16ContactCard key={key} section={section} sectionIndex={i} anchor={i === firstContact} />;
          default:
            return null;
        }
      })}
    </>
  );
}
