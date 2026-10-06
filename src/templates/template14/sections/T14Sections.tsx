"use client";

import { Fragment } from "react";

import type { BackedBySection, PageData } from "@/lib/pageSchema";
import { useT14 } from "../ctx";
import T14BackedBy from "./T14BackedBy";
import T14ContactCard from "./T14ContactCard";
import T14FAQ from "./T14FAQ";
import T14Gallery from "./T14Gallery";
import T14Feature from "./T14Feature";
import T14Hero from "./T14Hero";
import T14Rail from "./T14Rail";
import T14Showcase from "./T14Showcase";
import T14Spotlight from "./T14Spotlight";
import T14Strip from "./T14Strip";
import T14RichText from "./T14RichText";
import T14Services from "./T14Services";
import T14Team from "./T14Team";
import T14Testimonials from "./T14Testimonials";
import T14UseCases from "./T14UseCases";
import T14Values from "./T14Values";

/**
 * Renders every section type on any page, so sections added in the editor always show.
 * Only the first services / contact section on a page carries the `#services` / `#contact`
 * anchor, so ids never repeat. On the home page a live shop adds storefront blocks: category strip, feature card and
 * tabbed showcase under the hero, then the product rail and spotlight after the content sections (before a closing hero).
 */
export default function T14Sections({ pageData }: { pageData: PageData }) {
  const { pageKind, shop } = useT14();
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );
  const firstServices = sections.findIndex((s) => s.type === "services");
  const firstForm = sections.findIndex((s) => s.type === "contact_card" && s.showForm);
  const firstBackedBy = sections.findIndex((s) => s.type === "backed_by");
  // The strip (which swallows backed_by logos) only renders after a primary hero at index 0.
  const stripHost = sections[0]?.type === "hero";
  const storefront = pageKind === "home" && !!shop && shop.products.length > 0;
  // The closing "plain" hero (globe call-to-action) keeps its place; the rail and spotlight sit before it.
  const lastHero = sections.reduce((acc, s, i) => (s.type === "hero" && i > 0 ? i : acc), -1);
  const tail = storefront ? (
    <>
      <T14Rail />
      <T14Spotlight />
    </>
  ) : null;
  const firstContact = firstForm >= 0 ? firstForm : sections.findIndex((s) => s.type === "contact_card");

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        switch (section.type) {
          case "hero":
            return (
              <Fragment key={key}>
                {i === lastHero ? tail : null}
                <T14Hero section={section} sectionIndex={i} primary={i === 0} />
                {i === 0 && storefront ? (
                  <>
                    <T14Strip backedBy={firstBackedBy >= 0 ? (sections[firstBackedBy] as BackedBySection) : null} />
                    <T14Feature />
                    <T14Showcase />
                  </>
                ) : null}
              </Fragment>
            );
          case "services":
            return <T14Services key={key} section={section} sectionIndex={i} anchor={i === firstServices} />;
          case "richtext":
            return <T14RichText key={key} section={section} sectionIndex={i} />;
          case "values":
            return <T14Values key={key} section={section} sectionIndex={i} />;
          case "backed_by":
            return <T14BackedBy key={key} section={section} sectionIndex={i} inStrip={storefront && stripHost && i === firstBackedBy} />;
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
      {lastHero < 0 ? tail : null}
    </>
  );
}
