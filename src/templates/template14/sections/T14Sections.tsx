"use client";

import { Fragment } from "react";

import type { PageData } from "@/lib/pageSchema";
import { useT14 } from "../ctx";
import T14BackedBy from "./T14BackedBy";
import T14ContactCard from "./T14ContactCard";
import T14FAQ from "./T14FAQ";
import T14Gallery from "./T14Gallery";
import T14Hero from "./T14Hero";
import T14Storefront from "./T14Storefront";
import T14RichText from "./T14RichText";
import T14Services from "./T14Services";
import T14Team from "./T14Team";
import T14Testimonials from "./T14Testimonials";
import T14UseCases from "./T14UseCases";
import T14Values from "./T14Values";

/**
 * Renders every section type on any page, so sections added in the editor always show.
 * Only the first services / contact section on a page carries the `#services` / `#contact`
 * anchor, so ids never repeat. On the home page a live shop adds a storefront rows (categories, deals, popular) under the hero.
 */
export default function T14Sections({ pageData }: { pageData: PageData }) {
  const { pageKind } = useT14();
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
                <T14Hero section={section} sectionIndex={i} primary={i === 0} />
                {i === 0 && pageKind === "home" ? <T14Storefront /> : null}
              </Fragment>
            );
          case "services":
            return <T14Services key={key} section={section} sectionIndex={i} anchor={i === firstServices} />;
          case "richtext":
            return <T14RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T14Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T14BackedBy key={key} section={section} sectionIndex={i} />;
          case "use_cases":
            return <T14UseCases key={key} section={section} sectionIndex={i} />;
          case "testimonials":
            return <T14Testimonials key={key} section={section} sectionIndex={i} />;
          case "gallery":
            return <T14Gallery key={key} section={section} sectionIndex={i} />;
          case "team":
            return <T14Team key={key} section={section} sectionIndex={i} />;
          case "faq":
            return <T14FAQ key={key} section={section} sectionIndex={i} />;
          case "contact_card":
            return <T14ContactCard key={key} section={section} sectionIndex={i} anchor={i === firstContact} />;
          default:
            return null;
        }
      })}
    </>
  );
}
