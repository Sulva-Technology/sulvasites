"use client";

import { Fragment } from "react";

import type { PageData } from "@/lib/pageSchema";
import { useT13 } from "../ctx";
import T13BackedBy from "./T13BackedBy";
import T13ContactCard from "./T13ContactCard";
import T13FAQ from "./T13FAQ";
import T13Gallery from "./T13Gallery";
import T13Hero from "./T13Hero";
import T13Looks from "./T13Looks";
import T13RichText from "./T13RichText";
import T13Services from "./T13Services";
import T13Team from "./T13Team";
import T13Testimonials from "./T13Testimonials";
import T13UseCases from "./T13UseCases";
import T13Values from "./T13Values";

/**
 * Renders every section type on any page, so sections added in the editor always show.
 * Only the first services / contact section on a page carries the `#services` / `#contact`
 * anchor, so ids never repeat. On the home page a live shop adds a "Shop the looks" row under the hero.
 */
export default function T13Sections({ pageData }: { pageData: PageData }) {
  const { pageKind } = useT13();
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
            return (
              <Fragment key={key}>
                <T13Hero section={section} sectionIndex={i} primary={i === 0} />
                {i === 0 && pageKind === "home" ? <T13Looks /> : null}
              </Fragment>
            );
          case "services":
            return <T13Services key={key} section={section} sectionIndex={i} anchor={i === firstServices} />;
          case "richtext":
            return <T13RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T13Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T13BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T13UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T13Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T13Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T13Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T13FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T13ContactCard key={key} section={section} sectionIndex={i} anchor={i === firstContact} />;
          default:
            return null;
        }
      })}
    </>
  );
}
