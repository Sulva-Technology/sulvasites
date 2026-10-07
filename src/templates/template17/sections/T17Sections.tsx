"use client";

import { Fragment, type ReactNode } from "react";

import type { PageData } from "@/lib/pageSchema";
import T17BackedBy from "./T17BackedBy";
import T17ContactCard from "./T17ContactCard";
import T17FAQ from "./T17FAQ";
import T17Gallery from "./T17Gallery";
import T17Hero from "./T17Hero";
import T17RichText from "./T17RichText";
import T17Services from "./T17Services";
import T17Team from "./T17Team";
import T17Testimonials from "./T17Testimonials";
import T17UseCases from "./T17UseCases";
import T17Values from "./T17Values";

/**
 * Renders every section type on any page. `afterHero` (the home feed) goes straight after the
 * opening hero, or first when the page doesn't start with one.
 */
export default function T17Sections({ pageData, afterHero }: { pageData: PageData; afterHero?: ReactNode }) {
  const sections = (pageData.sections || []).filter((s): s is NonNullable<typeof s> => s != null && s.type != null);
  const firstForm = sections.findIndex((s) => s.type === "contact_card" && s.showForm);
  const firstContact = firstForm >= 0 ? firstForm : sections.findIndex((s) => s.type === "contact_card");
  const leadsWithHero = sections[0]?.type === "hero";

  return (
    <>
      {!leadsWithHero ? afterHero : null}
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        let node: ReactNode = null;
        switch (section.type) {
          case "hero":
            node = <T17Hero section={section} sectionIndex={i} primary={i === 0} />;
            break;
          case "services":
            node = <T17Services section={section} sectionIndex={i} />;
            break;
          case "richtext":
            node = <T17RichText section={section} sectionIndex={i} />;
            break;
          case "values":
            node = <T17Values section={section} sectionIndex={i} />;
            break;
          case "backed_by":
            node = <T17BackedBy section={section} sectionIndex={i} />;
            break;
          case "use_cases":
            node = <T17UseCases section={section} sectionIndex={i} />;
            break;
          case "testimonials":
            node = <T17Testimonials section={section} sectionIndex={i} />;
            break;
          case "gallery":
            node = <T17Gallery section={section} sectionIndex={i} />;
            break;
          case "team":
            node = <T17Team section={section} sectionIndex={i} />;
            break;
          case "faq":
            node = <T17FAQ section={section} sectionIndex={i} />;
            break;
          case "contact_card":
            node = <T17ContactCard section={section} sectionIndex={i} anchor={i === firstContact} />;
            break;
        }
        return (
          <Fragment key={key}>
            {node}
            {i === 0 && leadsWithHero ? afterHero : null}
          </Fragment>
        );
      })}
    </>
  );
}
