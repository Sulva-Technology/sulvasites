"use client";

import type { PageData } from "@/lib/pageSchema";
import type { T3HeroData, T3PageKind } from "./T3Hero";
import type { NavPage, TemplateProps } from "@/templates/registry";
import T3BackedBy from "./T3BackedBy";
import T3ContactCard from "./T3ContactCard";
import T3FAQ from "./T3FAQ";
import T3Gallery from "./T3Gallery";
import T3Hero from "./T3Hero";
import T3RichText from "./T3RichText";
import T3Services from "./T3Services";
import T3Team from "./T3Team";
import T3Testimonials from "./T3Testimonials";
import T3UseCases from "./T3UseCases";
import T3Values from "./T3Values";

/**
 * Renders every section type on any page (home/about/contact/extra), so a
 * section added in the editor always shows up. Index numbers count sections
 * after the hero: (01), (02), ...
 */
export default function T3Sections({
  pageData,
  profile,
  pageKind = "home",
  pageLabel = "",
  pageNumber = 1,
  heroData,
  navPages = [],
  baseUrl = "",
}: {
  pageData: PageData;
  profile: TemplateProps["profile"];
  pageKind?: T3PageKind;
  pageLabel?: string;
  pageNumber?: number;
  heroData?: T3HeroData;
  navPages?: NavPage[];
  baseUrl?: string;
}) {
  const sections = (pageData.sections || []).filter(
    (s): s is NonNullable<typeof s> => s != null && s.type != null,
  );

  let counter = 0;
  // Hero secondary button jumps to the first services/work section on this page, if any.
  const secondary = sections.some((s) => s.type === "services")
    ? { href: "#services", label: "What I do" }
    : sections.some((s) => s.type === "use_cases")
      ? { href: "#work", label: "See the work" }
      : null;

  return (
    <>
      {sections.map((section, i) => {
        const key = `${section.type}-${i}`;
        const n = section.type === "hero" ? 0 : ++counter;

        switch (section.type) {
          case "hero":
            return (
              <T3Hero
                key={key}
                section={section}
                sectionIndex={i}
                businessName={profile.business_name}
                available={i === 0}
                secondary={secondary}
                pageKind={pageKind}
                pageLabel={pageLabel}
                pageNumber={pageNumber}
                heroData={heroData}
                navPages={navPages}
                baseUrl={baseUrl}
                profile={profile}
              />
            );
          case "services":
            return <T3Services key={key} section={section} sectionIndex={i} n={n} />;
          case "richtext":
            return <T3RichText key={key} section={section} sectionIndex={i} n={n} />;
          case "values":
            return <T3Values key={key} section={section} sectionIndex={i} n={n} />;
          case "backed_by":
            return <T3BackedBy key={key} section={section} sectionIndex={i} n={n} />;
          case "use_cases":
            return <T3UseCases key={key} section={section} sectionIndex={i} n={n} />;
          case "testimonials":
            return <T3Testimonials key={key} section={section} sectionIndex={i} n={n} />;
          case "gallery":
            return <T3Gallery key={key} section={section} sectionIndex={i} n={n} />;
          case "team":
            return <T3Team key={key} section={section} sectionIndex={i} n={n} />;
          case "faq":
            return <T3FAQ key={key} section={section} sectionIndex={i} n={n} />;
          case "contact_card":
            return <T3ContactCard key={key} section={section} n={n} profile={profile} />;
          default:
            return null;
        }
      })}
    </>
  );
}
