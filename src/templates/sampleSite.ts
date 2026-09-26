import type { PageData } from "@/lib/pageSchema";
import type { TemplateProps } from "@/templates/registry";

/** Realistic sample content for previewing templates without a database (dev only). */

const home: PageData = {
  seo: { title: "Ada Okafor — Brand & Creative Direction", description: "Independent brand strategist." },
  sections: [
    {
      type: "hero",
      headline: "Brands with a point of view",
      subtext: "I help founders and growing teams find a clear story, a distinctive look, and the confidence to show up consistently.",
      ctaText: "Start a project",
      ctaHref: "#contact",
    },
    {
      type: "backed_by",
      title: "Trusted by teams at",
      logos: [
        { name: "Northwind", url: null },
        { name: "Kora Labs", url: null },
        { name: "Lumen & Co", url: null },
        { name: "Harbor Bank", url: null },
        { name: "Sable Studio", url: null },
      ],
    },
    {
      type: "services",
      items: [
        { title: "Brand strategy", desc: "Positioning, naming and messaging that makes you easy to choose." },
        { title: "Visual identity", desc: "Logo systems, type and colour built to scale across every touchpoint." },
        { title: "Creative direction", desc: "Campaigns and launches art-directed from first sketch to final frame." },
        { title: "Advisory", desc: "A senior sounding board for founders making big brand decisions." },
      ],
    },
    {
      type: "values",
      items: [
        { title: "Clarity first", desc: "If it can't be explained simply, it isn't ready yet." },
        { title: "Craft matters", desc: "The details are where trust is quietly earned." },
        { title: "Built to last", desc: "Work that still feels right five years from now." },
      ],
    },
    {
      type: "use_cases",
      title: "Selected work",
      description: "A few recent projects across fintech, hospitality and culture.",
      items: [
        { title: "Harbor Bank rebrand", description: "Repositioned a 40-year-old lender for a mobile-first generation — identity, app and launch campaign.", linkText: "View case study", linkHref: "#" },
        { title: "Kora Labs launch", description: "Naming, identity and a product launch that reached 50k sign-ups in its first month.", linkText: "View case study", linkHref: "#" },
        { title: "Lumen hotel group", description: "A warm, tactile identity system rolled out across six boutique properties.", linkText: "View case study", linkHref: "#" },
      ],
    },
    {
      type: "testimonials",
      title: "Kind words",
      items: [
        { name: "Tunde Bello", role: "CEO", company: "Kora Labs", quote: "Ada turned a messy set of ideas into a brand our whole team finally believes in. The launch simply wouldn't have landed without her." },
        { name: "Grace Mensah", role: "Marketing Director", company: "Harbor Bank", quote: "Rigorous, calm and genuinely creative. She made a complex rebrand feel easy." },
        { name: "Leo Hart", role: "Founder", company: "Sable Studio", quote: "The clearest thinker I've worked with. Every decision came with a reason." },
      ],
    },
    { type: "gallery", title: "In the studio", images: [] },
    {
      type: "faq",
      title: "Questions, answered",
      items: [
        { question: "How long does a typical project take?", answer: "Identity projects usually run 6–10 weeks; strategy sprints can be done in two." },
        { question: "Do you work with early-stage startups?", answer: "Yes — I offer a focused founder package for pre-seed and seed companies." },
        { question: "Where are you based?", answer: "Lagos, working with clients worldwide." },
      ],
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

const about: PageData = {
  seo: { title: "About", description: "" },
  sections: [
    { type: "hero", headline: "Designer, strategist, collaborator", subtext: "Twelve years helping ambitious teams say something worth hearing.", ctaText: "Work with me", ctaHref: "/contact" },
    {
      type: "richtext",
      title: "The short version",
      body: "<p>I started in advertising, fell for identity design, and have spent the last decade helping companies find the words and pictures that make them unmistakable.</p><p>Today I run a small independent studio. I keep the team small on purpose — you work with me directly, from the first workshop to the final file.</p><ul><li>12+ years in brand and creative</li><li>60+ identities launched</li><li>Clients across 9 countries</li></ul>",
    },
    {
      type: "team",
      title: "The studio",
      subtitle: "A small, senior team that stays with your project end to end.",
      members: [
        { name: "Ada Okafor", role: "Founder & Creative Director", bio: "Leads strategy and creative on every project.", photoUrl: "", linkedinUrl: "#" },
        { name: "Samir Diallo", role: "Senior Designer", bio: "Type nerd and systems thinker.", photoUrl: "", linkedinUrl: "" },
        { name: "Nia Adeyemi", role: "Producer", bio: "Keeps timelines honest and projects calm.", photoUrl: "", linkedinUrl: "" },
      ],
    },
    { type: "contact_card", showForm: false, mapLink: "" },
  ],
};

const contact: PageData = {
  seo: { title: "Contact", description: "" },
  sections: [
    { type: "hero", headline: "Let's talk about your brand", subtext: "Tell me where you are and where you want to go. I reply within one business day.", ctaText: "Email me", ctaHref: "#contact" },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=75`;

const estateHome: PageData = {
  seo: { title: "Harbourline Homes", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Homes in Lagos' most promising neighbourhoods",
      subtext: "Verified titles, inspected construction and payment terms agreed in writing — before you commit.",
      ctaText: "Browse properties",
      ctaHref: "",
    },
    {
      type: "backed_by",
      title: "Trusted by leading developers and partners",
      logos: [
        { name: "Oakline", url: null },
        { name: "Tessera", url: null },
        { name: "Brightwater", url: null },
        { name: "Meridian", url: null },
        { name: "Kestrel", url: null },
      ],
    },
    {
      type: "use_cases",
      title: "Featured properties",
      description: "A short list rather than a catalogue — each one visited and documented by our team.",
      items: [
        { title: "4-bed penthouse with private lift, Ikoyi", description: "All rooms en-suite, wraparound terrace with lagoon views, smart-home controls and 24/7 concierge. Title verified.", linkText: "Enquire", linkHref: "" },
        { title: "3-bed terrace, Lekki Phase 1", description: "Fitted kitchen, BQ, two parking spaces and a quiet close minutes from the expressway.", linkText: "Enquire", linkHref: "" },
        { title: "Serviced plot, Epe Gardens", description: "600 sqm in a gated estate with roads and power delivered. Flexible 18-month payment plan.", linkText: "Enquire", linkHref: "" },
      ],
    },
    {
      type: "services",
      items: [
        { title: "Buy a home", desc: "Shortlists matched to your brief, accompanied viewings and help through every document." },
        { title: "Rent with confidence", desc: "Verified landlords, clear tenancy terms and a smooth move-in." },
        { title: "Sell for the right price", desc: "Accurate valuation, professional marketing and qualified buyers." },
        { title: "Property management", desc: "Tenants, maintenance and rent collection handled for you." },
      ],
    },
    {
      type: "values",
      items: [
        { title: "Location before everything", desc: "We list in districts with roads, power and water already delivered." },
        { title: "Documentation checked first", desc: "Title and approvals confirmed with the land registry before listing." },
        { title: "Build quality you can inspect", desc: "Every development can be visited; specifications are documented." },
        { title: "Terms that fit the purchase", desc: "Prices and payment plans agreed in writing before any deposit." },
      ],
    },
    {
      type: "gallery",
      title: "Inside our properties",
      images: [
        { url: u("photo-1600596542815-ffad4c1539a9"), alt: "Ikoyi penthouse" },
        { url: u("photo-1600585154340-be6161a56a0c"), alt: "Lekki terrace" },
        { url: u("photo-1600607687939-ce8a6c25118c"), alt: "Living room" },
        { url: u("photo-1600566753190-17f0baa2a6c3"), alt: "Kitchen" },
        { url: u("photo-1600210492486-724fe5c67fb0"), alt: "Bedroom" },
        { url: u("photo-1512917774080-9991f1c4c750"), alt: "Pool" },
      ],
    },
    {
      type: "testimonials",
      title: "What our clients say",
      items: [
        { name: "Chioma Eze", role: "Homeowner", company: "Lekki", quote: "They showed us the title search before we even asked. Buying our first home felt safe for the first time." },
        { name: "David Adeleke", role: "Investor", company: "", quote: "Clear numbers, honest advice and no pressure. I've bought three units through them now." },
        { name: "Fatima Bello", role: "Tenant", company: "Ikoyi", quote: "Moved in on the agreed date with every repair done. Rare in this city." },
        { name: "Samuel Okoro", role: "Seller", company: "", quote: "Sold above our asking price in five weeks with qualified buyers only." },
      ],
    },
    {
      type: "faq",
      title: "Frequently asked questions",
      items: [
        { question: "How do I book a viewing?", answer: "Use the form below or call us — we'll confirm a time within one business day." },
        { question: "Do you verify property documents?", answer: "Yes. Title and approvals are checked before listing and shared with serious buyers." },
        { question: "Do you offer payment plans?", answer: "Many developments offer 6–24 month plans, agreed in writing." },
        { question: "Can you help diaspora buyers?", answer: "Yes — video viewings, verified documents and escrow-style payments." },
      ],
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

function estateSite(): TemplateProps {
  const base = sampleSiteBase("t6");
  return {
    ...base,
    profile: {
      ...base.profile,
      business_name: "Harbourline Homes",
      tagline: "Verified property in Lagos — bought, sold and rented with care.",
      email: "hello@harbourline.ng",
    },
    pages: { ...base.pages, home: estateHome },
    navPages: [
      { key: "properties", label: "Properties" },
      { key: "services", label: "Services" },
    ],
  };
}

const beautyHome: PageData = {
  seo: { title: "Amara Glam Studio", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Soft glam that feels like you",
      subtext: "Skin-first makeup for brides, events and everyday confidence — in a calm Lekki studio or at your location.",
      ctaText: "Book an appointment",
      ctaHref: "",
    },
    {
      type: "backed_by",
      title: "As seen in",
      logos: [
        { name: "Bella Naija Weddings", url: null },
        { name: "Glam Diary", url: null },
        { name: "Style Rave", url: null },
        { name: "The Bride Edit", url: null },
      ],
    },
    {
      type: "services",
      items: [
        { title: "Soft glam", desc: "Radiant skin, soft definition and lashes — polished but still you." },
        { title: "Bridal makeup", desc: "Consultation, trial and wedding-day glam built to last." },
        { title: "Event & photoshoot", desc: "Camera-ready, long-wear looks for your big moments." },
        { title: "Gele tying", desc: "Elegant, secure styles for traditional ceremonies." },
        { title: "Brows & lashes", desc: "Shaping, tint and lash application to frame your face." },
        { title: "Makeup lessons", desc: "One-to-one sessions to master your everyday look." },
      ],
    },
    {
      type: "use_cases",
      title: "Signature packages",
      description: "Curated experiences for the moments that matter.",
      items: [
        { title: "The Everyday", description: "Soft glam session plus a quick lesson on recreating the look at home.", linkText: "Book this", linkHref: "" },
        { title: "The Bride", description: "Trial, wedding-day makeup, gele and a touch-up kit for the reception.", linkText: "Book this", linkHref: "" },
        { title: "The Party", description: "Glam for you and up to four guests, at the studio or on location.", linkText: "Book this", linkHref: "" },
      ],
    },
    {
      type: "values",
      items: [
        { title: "Consult", desc: "We talk through your style, skin and occasion first." },
        { title: "Create", desc: "Skin prep, then a look designed to photograph beautifully." },
        { title: "Glow", desc: "Leave confident, with a touch-up plan for the hours ahead." },
      ],
    },
    {
      type: "gallery",
      title: "Recent looks",
      images: [
        { url: u("photo-1487412947147-5cebf100ffc2"), alt: "Soft glam" },
        { url: u("photo-1522335789203-aabd1fc54bc9"), alt: "Studio" },
        { url: u("photo-1596462502278-27bfdc403348"), alt: "Palette" },
        { url: u("photo-1512496015851-a90fb38ba796"), alt: "Details" },
      ],
    },
    {
      type: "testimonials",
      title: "Kind words",
      items: [
        { name: "Tolu A.", role: "Bride", company: "", quote: "I cried happy tears when I saw myself. My makeup lasted from the church to the very last dance." },
        { name: "Ngozi E.", role: "Birthday shoot", company: "", quote: "So calm, so professional, and the photos came out flawless." },
        { name: "Kemi O.", role: "Regular client", company: "", quote: "The only artist I trust with my skin. Always on time, always perfect." },
      ],
    },
    {
      type: "faq",
      title: "Booking policies & FAQ",
      items: [
        { question: "How do I secure my booking?", answer: "A non-refundable booking fee holds your slot and is deducted from your total." },
        { question: "Can I reschedule?", answer: "Yes — with at least 24 hours' notice your fee moves to the new date." },
        { question: "Do you travel?", answer: "We do. Send the address and we'll quote a travel fee." },
      ],
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

function beautySite(): TemplateProps {
  const base = sampleSiteBase("t5");
  return {
    ...base,
    profile: {
      ...base.profile,
      business_name: "Amara Glam",
      tagline: "Soft glam and bridal beauty in Lagos.",
      email: "book@amaraglam.ng",
      socials: { instagram: "https://instagram.com", tiktok: "https://tiktok.com" },
    },
    pages: { ...base.pages, home: beautyHome },
    navPages: [
      { key: "services", label: "Services" },
      { key: "portfolio", label: "Portfolio" },
      { key: "book", label: "Book" },
    ],
  };
}

export function sampleSite(templateKey: string): TemplateProps {
  if (templateKey === "t6") return estateSite();
  if (templateKey === "t5") return beautySite();
  return sampleSiteBase(templateKey);
}

function sampleSiteBase(templateKey: string): TemplateProps {
  return {
    site: { id: "sample", slug: "sample", template_key: templateKey },
    profile: {
      business_name: "Ada Okafor",
      tagline: "Brand strategy and creative direction for teams with something to say.",
      description: "Independent brand strategist and creative director.",
      address: "12 Admiralty Way, Lekki, Lagos",
      phone: "+234 801 234 5678",
      email: "hello@adaokafor.studio",
      whatsapp: "+2348012345678",
      socials: { instagram: "https://instagram.com", twitter: "https://x.com" },
      logo_asset_id: null,
      logo_path: null,
    },
    pages: { home, about, contact },
    navPages: [
      { key: "work", label: "Work" },
      { key: "services", label: "Services" },
    ],
  };
}
