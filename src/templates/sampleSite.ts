import { defaultSection, type PageData, type Section } from "@/lib/pageSchema";
import { categoryForTemplate, fillSiteImages, PEOPLE_PHOTOS, photoUrl, STOCK_PHOTOS } from "@/lib/stockPhotos";
import { getPagePresets } from "@/templates/pagePresets";
import type { ShopData } from "@/lib/shop/types";
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

const productHome: PageData = {
  seo: { title: "Plated — scheduled meal delivery", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Order once. Eat on time, every time",
      subtext: "Pre-order meals from trusted kitchens and get breakfast, lunch or dinner delivered exactly when you need it.",
      ctaText: "Get the app",
      ctaHref: "",
    },
    {
      type: "backed_by",
      title: "Trusted by students, kitchens and riders across 12 campuses",
      logos: [
        { name: "UniLag", url: null },
        { name: "Covenant", url: null },
        { name: "OAU", url: null },
        { name: "Babcock", url: null },
        { name: "Pan-Atlantic", url: null },
        { name: "UI", url: null },
      ],
    },
    {
      type: "services",
      items: [
        { title: "Scheduled delivery", desc: "Pick a time window once — your meal arrives on schedule, every day." },
        { title: "Trusted kitchens", desc: "Verified vendors with ratings you can see." },
        { title: "Weekly plans", desc: "Subscribe for the week and forget about it." },
        { title: "Group ordering", desc: "Batch deliveries mean lower fees for everyone." },
        { title: "Live tracking", desc: "Know exactly where your food is." },
      ],
    },
    {
      type: "use_cases",
      title: "Made for everyone on campus",
      description: "",
      items: [
        { title: "Students", description: "No more queues between lectures. Plan your meals for the week in two minutes and get them delivered to your hostel or faculty.", linkText: "Download the app", linkHref: "" },
        { title: "Kitchens & vendors", description: "Predictable orders, less waste and payouts every week. Join the vendor programme and reach thousands of students.", linkText: "Become a vendor", linkHref: "" },
        { title: "Riders", description: "Batched routes and fixed delivery windows mean more deliveries per hour and better earnings.", linkText: "Ride with us", linkHref: "" },
      ],
    },
    {
      type: "values",
      items: [
        { title: "Choose your meal", desc: "Browse verified campus kitchens." },
        { title: "Pick a time", desc: "Breakfast, lunch or dinner windows." },
        { title: "Schedule & pay", desc: "Today, tomorrow or the whole week." },
        { title: "Enjoy", desc: "Delivered on time, perfectly packed." },
      ],
    },
    {
      type: "testimonials",
      title: "Students love it",
      items: [
        { name: "Ada N.", role: "300L Medicine", company: "", quote: "I used to skip lunch during clinicals. Now it's just there when I need it." },
        { name: "Tobi F.", role: "Vendor", company: "Mama T's Kitchen", quote: "Orders are predictable now, so I waste almost nothing." },
        { name: "Seun A.", role: "200L Engineering", company: "", quote: "Cheaper than ordering on my own and always on time." },
        { name: "Grace O.", role: "Rider", company: "", quote: "Batched routes changed everything. More deliveries, less stress." },
        { name: "Musa B.", role: "400L Law", company: "", quote: "Exam season saviour. Set it for the week and forgot about food." },
      ],
    },
    {
      type: "faq",
      title: "Questions? Answers.",
      items: [
        { question: "Which campuses do you cover?", answer: "We're live on 12 campuses and adding more every term." },
        { question: "Can I change my order?", answer: "Yes — edit or cancel up to 2 hours before your delivery window." },
        { question: "How do payments work?", answer: "Pay securely in the app by card or transfer. Weekly plans are billed upfront." },
        { question: "How do I become a vendor?", answer: "Apply in the app — we'll visit your kitchen and get you set up within a week." },
      ],
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

function productSite(): TemplateProps {
  const base = sampleSiteBase("t4");
  return {
    ...base,
    profile: {
      ...base.profile,
      business_name: "Plated",
      tagline: "Scheduled campus meal delivery",
      email: "hello@plated.app",
      socials: { twitter: "https://x.com", instagram: "https://instagram.com" },
    },
    pages: { ...base.pages, home: productHome },
    navPages: [
      { key: "features", label: "Features" },
      { key: "how-it-works", label: "How It Works" },
    ],
  };
}

const food = (i: number) => {
  const p = STOCK_PHOTOS.food[i % STOCK_PHOTOS.food.length]!;
  return { url: photoUrl(p.id), alt: p.alt };
};
const person = (i: number) => photoUrl(PEOPLE_PHOTOS[i % PEOPLE_PHOTOS.length]!.id, 800);

const restaurantHome: PageData = {
  seo: { title: "Ember Table — wood-fired West African kitchen", description: "" },
  sections: [
    {
      type: "hero",
      headline: "West African cooking, slow-smoked over open fire",
      subtext: "Market produce, long-held family recipes and a wood-fired grill at the heart of the room. Come hungry, stay late.",
      ctaText: "Reserve a table",
      ctaHref: "",
    },
    {
      type: "backed_by",
      title: "As featured in",
      logos: [
        { name: "The Lagos Table", url: null },
        { name: "Eat Drink Lagos", url: null },
        { name: "Afro Food Notes", url: null },
        { name: "City Weekend", url: null },
      ],
    },
    {
      type: "services",
      items: [
        { title: "Suya-spiced lamb chops · ₦14,500", desc: "Yaji butter, charred onion, fresh pepper salsa." },
        { title: "Smoked party jollof · ₦8,500", desc: "Cooked over firewood, with fried plantain and coleslaw." },
        { title: "Whole grilled croaker · ₦16,000", desc: "Ata dindin, roasted yam, lime." },
        { title: "Asun skewers · ₦7,000", desc: "Spicy goat, scotch bonnet glaze, crisp onions." },
        { title: "Ofada rice & ayamase · ₦9,500", desc: "Green pepper stew, locust beans, boiled egg." },
        { title: "Catfish pepper soup · ₦6,500", desc: "Uziza, scent leaf, a hit of heat." },
        { title: "Dodo & palm-oil butter · ₦4,000", desc: "Sweet plantain, warm agege bread." },
        { title: "Zobo granita · ₦3,500", desc: "Hibiscus, ginger and pineapple, shaved to order." },
      ],
    },
    {
      type: "values",
      items: [
        { title: "Cooked over fire", desc: "Everything that can meet the grill does — hardwood, never gas." },
        { title: "Market to table", desc: "We buy from Mile 12 and Epe fishermen every morning." },
        { title: "Made to share", desc: "Big platters, long tables and plenty of bread to mop up." },
        { title: "Nothing wasted", desc: "Bones become stock, peels become pickles, trimmings feed the staff." },
      ],
    },
    {
      type: "gallery",
      title: "From our table",
      images: [food(1), food(6), food(2), food(5), food(4), food(0)],
    },
    {
      type: "use_cases",
      title: "Gatherings & occasions",
      description: "From birthday dinners to office lunches, we'll plan the menu with you.",
      items: [
        { title: "Private dining", description: "Our back room seats up to 18 around one long table, with a sharing menu from the grill.", linkText: "Enquire", linkHref: "" },
        { title: "Celebrations", description: "Birthdays, engagements and anniversaries — cake from our pastry kitchen on request.", linkText: "Enquire", linkHref: "" },
        { title: "Outside catering", description: "Jollof, suya and small chops for 30 to 300 guests, delivered and served.", linkText: "Enquire", linkHref: "" },
      ],
    },
    {
      type: "testimonials",
      title: "From our guests",
      items: [
        { name: "Funmi A.", role: "Regular", company: "", quote: "The smoked jollof alone is worth the drive across the bridge. It tastes like a Sunday party at my grandmother's." },
        { name: "Daniel K.", role: "Birthday dinner", company: "", quote: "They set the long table for twelve of us and kept the platters coming. Warm service, no rush." },
        { name: "Amaka O.", role: "Food writer", company: "Eat Drink Lagos", quote: "Confident, generous cooking — the lamb chops are the best thing on the island right now." },
      ],
    },
    {
      type: "faq",
      title: "Good to know",
      items: [
        { question: "Do you take walk-ins?", answer: "Yes, when there's room — weekends fill up, so we recommend booking ahead." },
        { question: "Can you cater for allergies?", answer: "Tell us when you book and our chefs will adapt dishes wherever they can." },
        { question: "Is there parking?", answer: "Free parking in the compound for guests, with attendants from 6pm." },
        { question: "Can we book the private room?", answer: "Yes — send a request with your date and group size and we'll share menus." },
      ],
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

const restaurantAbout: PageData = {
  seo: { title: "Our story", description: "" },
  sections: [
    {
      type: "hero",
      headline: "A kitchen built around the fire",
      subtext: "Ember Table started as a weekend suya stand. Today it's a 60-seat dining room — but the grill still runs the show.",
      ctaText: "Reserve a table",
      ctaHref: "",
    },
    {
      type: "richtext",
      title: "How it started",
      body: "<p>Chef Tobi Adeyemi grew up cooking for family parties in Ibadan, where the best food always came off the open fire. After years in hotel kitchens, he opened a suya stand on weekends to cook the food he actually loved.</p><p>The queues grew, the stand became a kitchen, and the kitchen became Ember Table: one room, one grill and a menu that changes with the market.</p><ul><li>Hardwood grill, lit every afternoon</li><li>Produce bought fresh each morning</li><li>Sharing plates for tables of two to twenty</li></ul>",
    },
    {
      type: "team",
      title: "The people behind the pass",
      subtitle: "A small kitchen and floor team who cook, serve and eat together.",
      members: [
        { name: "Tobi Adeyemi", role: "Chef & founder", bio: "Runs the grill and writes the menu every week.", photoUrl: person(0), linkedinUrl: "" },
        { name: "Zainab Musa", role: "Pastry chef", bio: "Breads, desserts and the famous zobo granita.", photoUrl: person(1), linkedinUrl: "" },
        { name: "Kunle Bakare", role: "General manager", bio: "Looks after the room — and your reservation.", photoUrl: person(3), linkedinUrl: "" },
      ],
    },
    {
      type: "gallery",
      title: "In the kitchen",
      images: [food(3), food(11), food(10), food(7)],
    },
    { type: "contact_card", showForm: false, mapLink: "" },
  ],
};

const restaurantContact: PageData = {
  seo: { title: "Visit & reserve", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Come and eat with us",
      subtext: "Book a table online, call the restaurant, or drop in — we keep a few tables for walk-ins every night.",
      ctaText: "Request a table",
      ctaHref: "#reserve",
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

function restaurantSite(): TemplateProps {
  const base = sampleSiteBase("t7");
  return {
    ...base,
    profile: {
      ...base.profile,
      business_name: "Ember Table",
      tagline: "Wood-fired West African cooking in Victoria Island, Lagos.",
      description: "Restaurant and private dining room.",
      address: "14 Akin Adesola Street, Victoria Island, Lagos",
      phone: "+234 802 555 0147",
      email: "book@embertable.ng",
      whatsapp: "+2348025550147",
      socials: {
        instagram: "https://instagram.com",
        tiktok: "https://tiktok.com",
        hours: "Tue–Thu · 12:00–22:00\nFri–Sat · 12:00–23:30\nSunday · 12:00–21:00\nMonday · Closed",
      },
    },
    pages: { home: restaurantHome, about: restaurantAbout, contact: restaurantContact },
  };
}

const clinic = (i: number) => {
  const p = STOCK_PHOTOS.clinic[i % STOCK_PHOTOS.clinic.length]!;
  return { url: photoUrl(p.id), alt: p.alt };
};

const clinicHome: PageData = {
  seo: { title: "Cedar Family Clinic — family doctors in Lekki, Lagos", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Unhurried care for the whole family",
      subtext: "Same-week appointments with GPs, paediatricians and dentists who take time to listen — all under one roof in Lekki.",
      ctaText: "Book an appointment",
      ctaHref: "",
    },
    {
      type: "backed_by",
      title: "Registered & accredited",
      logos: [
        { name: "Registered with the medical council", url: null },
        { name: "State health facility licence", url: null },
        { name: "Insurance-approved provider", url: null },
      ],
    },
    {
      type: "services",
      items: [
        { title: "General consultations", desc: "See a family doctor for new symptoms, ongoing conditions or a second opinion." },
        { title: "Children's health", desc: "Check-ups, growth reviews and sick visits with our paediatric team." },
        { title: "Women's health", desc: "Antenatal care, family planning and well-woman screening." },
        { title: "Dental care", desc: "Check-ups, cleaning, fillings and gentle care for nervous patients." },
        { title: "Lab tests & screening", desc: "Blood tests and health screens on site, with results explained by a doctor." },
        { title: "Vaccinations", desc: "Childhood immunisations, travel vaccines and seasonal flu shots." },
      ],
    },
    {
      type: "values",
      items: [
        { title: "Time to talk", desc: "Appointments are long enough to ask every question on your list." },
        { title: "One record, one team", desc: "Your doctor, dentist and lab share notes, so you only tell your story once." },
        { title: "Clear, upfront pricing", desc: "We share costs before treatment and work with major HMOs." },
        { title: "Care for all ages", desc: "From newborn checks to managing long-term conditions in later life." },
      ],
    },
    {
      type: "gallery",
      title: "Inside the clinic",
      images: [clinic(0), clinic(7), clinic(1), clinic(6), clinic(4), clinic(11)],
    },
    {
      type: "testimonials",
      title: "What our patients say",
      items: [
        { name: "Ngozi E.", role: "Patient since 2021", company: "", quote: "Dr Bello actually listened. I left with a plan I understood and a follow-up call two days later." },
        { name: "Tunde A.", role: "Parent", company: "", quote: "Our son hates hospitals, but the paediatric team made his check-up feel like a game." },
        { name: "Halima S.", role: "Dental patient", company: "", quote: "Calm, spotless and on time. The first dentist I haven't been nervous to visit." },
      ],
    },
    {
      type: "faq",
      title: "Frequently asked questions",
      items: [
        { question: "Do I need a referral to book?", answer: "No. You can book directly with any of our doctors or dentists." },
        { question: "Do you accept HMO and insurance plans?", answer: "Yes, we work with most major HMOs. Bring your card and we'll confirm your cover at reception." },
        { question: "Can I see a doctor on the same day?", answer: "We keep a few same-day slots each morning. Call us early and we'll do our best to fit you in." },
        { question: "What should I bring to my first visit?", answer: "A photo ID, your HMO card if you have one, and a list of any medicines you take." },
      ],
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

const clinicAbout: PageData = {
  seo: { title: "About the clinic", description: "" },
  sections: [
    {
      type: "hero",
      headline: "A neighbourhood clinic that knows your name",
      subtext: "Cedar was founded by two family doctors who wanted care in Lekki to feel personal again — longer appointments, one shared record and a team you see every time.",
      ctaText: "Book an appointment",
      ctaHref: "",
    },
    {
      type: "richtext",
      title: "How we work",
      body: "<p>Every new patient starts with a longer first appointment, so your doctor can understand your history and what matters to you. After that, you'll see the same small team whenever you visit.</p><ul><li>GP, paediatric, women's health and dental care in one building</li><li>On-site laboratory with results reviewed by your doctor</li><li>Follow-up calls after every new diagnosis</li></ul>",
    },
    {
      type: "team",
      title: "Meet our doctors",
      subtitle: "Experienced clinicians who take the time to explain, and to listen.",
      members: [
        { name: "Dr Amaka Bello", role: "Family physician", bio: "Co-founder. Looks after adults and long-term conditions like diabetes and hypertension.", photoUrl: person(9), linkedinUrl: "" },
        { name: "Dr Femi Adeyemi", role: "Paediatrician", bio: "Co-founder. Leads children's health, from newborn checks to teenage visits.", photoUrl: person(0), linkedinUrl: "" },
        { name: "Dr Kemi Okoro", role: "Dental surgeon", bio: "Gentle general dentistry, with extra time for nervous patients.", photoUrl: person(10), linkedinUrl: "" },
      ],
    },
    {
      type: "use_cases",
      title: "Who we care for",
      description: "Whatever your stage of life, there's a doctor here who looks after people like you.",
      items: [
        { title: "Families & children", description: "Check-ups, vaccinations and sick visits for every member of the family.", linkText: "Book a visit", linkHref: "" },
        { title: "Women's health", description: "Antenatal care, screening and advice in a private, unhurried setting.", linkText: "Book a visit", linkHref: "" },
        { title: "Long-term conditions", description: "Regular reviews and medicine checks for diabetes, hypertension and asthma.", linkText: "Book a visit", linkHref: "" },
      ],
    },
    {
      type: "gallery",
      title: "Our space",
      images: [clinic(2), clinic(3), clinic(5), clinic(8)],
    },
    { type: "contact_card", showForm: false, mapLink: "" },
  ],
};

const clinicContact: PageData = {
  seo: { title: "Contact & appointments", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Book a visit or get in touch",
      subtext: "Send an appointment request below, call reception, or message us on WhatsApp during opening hours.",
      ctaText: "Request an appointment",
      ctaHref: "#book",
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

function clinicSite(): TemplateProps {
  const base = sampleSiteBase("t8");
  return {
    ...base,
    profile: {
      ...base.profile,
      business_name: "Cedar Family Clinic",
      tagline: "Family doctors, paediatrics and dental care in Lekki, Lagos.",
      description: "Family medical and dental clinic.",
      address: "7 Fola Osibo Road, Lekki Phase 1, Lagos",
      phone: "+234 803 555 0192",
      email: "care@cedarclinic.ng",
      whatsapp: "+2348035550192",
      socials: {
        instagram: "https://instagram.com",
        facebook: "https://facebook.com",
        hours: "Mon–Fri · 08:00–20:00\nSaturday · 09:00–16:00\nSunday · Closed",
      },
    },
    pages: { home: clinicHome, about: clinicAbout, contact: clinicContact },
  };
}

const fit = (i: number) => {
  const p = STOCK_PHOTOS.fitness[i % STOCK_PHOTOS.fitness.length]!;
  return { url: photoUrl(p.id), alt: p.alt };
};

const fitnessHome: PageData = {
  seo: { title: "Ironhouse Training Club — strength & conditioning in Ikoyi, Lagos", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Train hard. Get strong.",
      subtext: "Coach-led strength, conditioning and yoga classes for every level — small groups, real programming and a crew that keeps you coming back.",
      ctaText: "Start free trial",
      ctaHref: "",
    },
    {
      type: "services",
      items: [
        { title: "Strength Lab", desc: "Barbell fundamentals and progressive lifting in small, coached groups." },
        { title: "HIIT Burn", desc: "Fast intervals on the rower, bike and floor. Scaled for every level." },
        { title: "Boxing Conditioning", desc: "Pad work, footwork and bag rounds for power and stamina." },
        { title: "Kettlebell Flow", desc: "Swings, carries and complexes to build a strong, resilient body." },
        { title: "Power Yoga", desc: "A strong, sweaty vinyasa class for mobility, balance and breath." },
        { title: "Mobility & Recovery", desc: "Slow stretching and breathwork to reset after a hard week." },
      ],
    },
    {
      type: "values",
      items: [
        { title: "Starter", desc: "Two coached classes a week — the easiest way to build the habit." },
        { title: "Unlimited", desc: "Every class on the timetable, open-gym access and a monthly coach check-in." },
        { title: "Personal training", desc: "One-to-one sessions with a programme written around your goals." },
      ],
    },
    {
      type: "gallery",
      title: "Inside the club",
      images: [fit(0), fit(3), fit(6), fit(1), fit(8), fit(5)],
    },
    {
      type: "testimonials",
      title: "Real results",
      items: [
        { name: "Chioma N.", role: "Member since 2023", company: "", quote: "I walked in unable to do a push-up. Now I look forward to heavy days." },
        { name: "Seyi O.", role: "Unlimited member", company: "", quote: "The coaches actually watch your form. I've never felt this strong or this confident." },
        { name: "Bisi A.", role: "Power Yoga regular", company: "", quote: "Yoga twice a week fixed my back and my sleep. The community is the best part." },
      ],
    },
    {
      type: "faq",
      title: "Questions, answered",
      items: [
        { question: "I'm a complete beginner. Is that okay?", answer: "Absolutely. Every class can be scaled, and your coach will show you each movement before you start." },
        { question: "What does the free trial include?", answer: "A session with a coach to talk through your goals, followed by a class of your choice." },
        { question: "What should I bring?", answer: "Comfortable kit, trainers and a water bottle. We have towels, mats and lockers." },
        { question: "Can I freeze my membership?", answer: "Yes — talk to the front desk if you're travelling or recovering from an injury." },
      ],
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

const fitnessAbout: PageData = {
  seo: { title: "About the club", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Built by coaches, run for members",
      subtext: "Ironhouse started as a garage gym with six regulars. Today it's a full training club — but every session is still coached, and we still know your name.",
      ctaText: "Start free trial",
      ctaHref: "",
    },
    {
      type: "backed_by",
      title: "Partners & affiliations",
      logos: [
        { name: "Certified strength coaches", url: null },
        { name: "Partner physiotherapy clinic", url: null },
        { name: "Corporate wellness partner", url: null },
      ],
    },
    {
      type: "richtext",
      title: "How we train",
      body: "<p>Every member starts with a coached intro session, so we can understand your history, your goals and any injuries before you join a class.</p><ul><li>Small groups so coaches can correct your form</li><li>Programming that progresses week to week</li><li>Open-gym time to practise on your own</li></ul>",
    },
    {
      type: "team",
      title: "Meet the coaches",
      subtitle: "Experienced, qualified and genuinely invested in your progress.",
      members: [
        { name: "Tunde Bakare", role: "Head coach · Strength", bio: "Founded Ironhouse. Lives for big lifts done with good technique.", photoUrl: person(4), linkedinUrl: "" },
        { name: "Adaeze Obi", role: "HIIT & conditioning", bio: "Former sprinter. Her classes are hard, fast and always fun.", photoUrl: person(9), linkedinUrl: "" },
        { name: "Musa Ibrahim", role: "Boxing coach", bio: "Teaches proper technique first, then makes you sweat.", photoUrl: person(14), linkedinUrl: "" },
        { name: "Funmi Coker", role: "Yoga & mobility", bio: "Strong flows, slow stretches and breathwork that sticks.", photoUrl: person(5), linkedinUrl: "" },
      ],
    },
    {
      type: "use_cases",
      title: "Programmes for every goal",
      description: "Not sure where to start? Pick the goal that sounds most like you.",
      items: [
        { title: "Get strong", description: "Learn the big lifts safely and add weight to the bar every month.", linkText: "Start free trial", linkHref: "" },
        { title: "Lose fat", description: "Conditioning classes plus simple nutrition habits you can keep.", linkText: "Start free trial", linkHref: "" },
        { title: "Move better", description: "Yoga and mobility work for stiff backs, hips and desk-bound days.", linkText: "Start free trial", linkHref: "" },
      ],
    },
    {
      type: "gallery",
      title: "The space",
      images: [fit(2), fit(4), fit(7), fit(9)],
    },
    { type: "contact_card", showForm: false, mapLink: "" },
  ],
};

const fitnessContact: PageData = {
  seo: { title: "Contact & free trial", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Come train with us",
      subtext: "Request your free trial below, call the front desk, or message us on WhatsApp.",
      ctaText: "Start free trial",
      ctaHref: "#join",
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

function fitnessSite(): TemplateProps {
  const base = sampleSiteBase("t9");
  return {
    ...base,
    profile: {
      ...base.profile,
      business_name: "Ironhouse",
      tagline: "Coach-led strength, conditioning and yoga in Ikoyi, Lagos.",
      description: "Strength and conditioning gym with group classes and personal training.",
      address: "24 Kingsway Road, Ikoyi, Lagos",
      phone: "+234 809 555 0147",
      email: "train@ironhouse.ng",
      whatsapp: "+2348095550147",
      socials: {
        instagram: "https://instagram.com",
        tiktok: "https://tiktok.com",
        youtube: "https://youtube.com",
        hours: "Mon–Fri · 05:30–22:00\nSaturday · 07:00–18:00\nSunday · 08:00–14:00",
      },
    },
    pages: { home: fitnessHome, about: fitnessAbout, contact: fitnessContact },
  };
}

const edu = (i: number) => {
  const p = STOCK_PHOTOS.education[i % STOCK_PHOTOS.education.length]!;
  return { url: photoUrl(p.id), alt: p.alt };
};

const educationHome: PageData = {
  seo: { title: "Brightway Academy — nursery, primary and secondary school in Yaba, Lagos", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Where curious minds grow.",
      subtext: "A warm, ambitious school for ages 3 to 18 — small classes, caring teachers and a clear plan for every learner, from first words to final exams.",
      ctaText: "Apply now",
      ctaHref: "",
    },
    {
      type: "services",
      items: [
        { title: "Early Years", desc: "Play-based learning for ages 3–5: phonics, numbers, stories and lots of outdoor time." },
        { title: "Primary School", desc: "Strong foundations in reading, writing and maths, with science, art and music every week." },
        { title: "Secondary School", desc: "A broad curriculum with specialist teachers, practical labs and guidance on subject choices." },
        { title: "Exam Preparation", desc: "Focused revision classes, past-paper practice and one-to-one feedback before the big exams." },
        { title: "Coding & Robotics Club", desc: "After-school sessions building games, apps and small robots in friendly teams." },
        { title: "Weekend Tutoring", desc: "Small-group catch-up and stretch sessions on Saturday mornings, open to non-students too." },
      ],
    },
    {
      type: "use_cases",
      title: "A clear path, from first day to graduation",
      description: "Join at any stage — we'll help you find the right starting point.",
      items: [
        { title: "Start in Early Years", description: "Settle in with gentle routines, play and early reading.", linkText: "Ask about Early Years", linkHref: "" },
        { title: "Build strong foundations", description: "Primary years that make reading, writing and maths feel easy.", linkText: "Ask about Primary", linkHref: "" },
        { title: "Explore and specialise", description: "Secondary subjects, clubs and leadership roles that build confidence.", linkText: "Ask about Secondary", linkHref: "" },
        { title: "Graduate ready", description: "Exam preparation and guidance for university, college or work.", linkText: "Ask about exam prep", linkHref: "" },
      ],
    },
    {
      type: "gallery",
      title: "Life on campus",
      images: [edu(1), edu(2), edu(7), edu(4), edu(10), edu(5)],
    },
    {
      type: "testimonials",
      title: "Stories from our families",
      items: [
        { name: "Mrs. Folake A.", role: "Parent, Primary", company: "", quote: "Our daughter used to dread reading. Two terms in, she reads to us every night — the teachers really know her." },
        { name: "Chinedu O.", role: "Student, Secondary", company: "", quote: "The coding club is the best part of my week. I built my first app here and now I want to study computer science." },
        { name: "Mr. Ibrahim S.", role: "Parent, Early Years", company: "", quote: "Settling in was so gentle. We get updates and photos, and our son runs in every morning." },
      ],
    },
    {
      type: "faq",
      title: "Admissions questions",
      items: [
        { question: "When can my child join?", answer: "We welcome new learners at the start of each term, and mid-term when places allow. Book a visit and we'll talk you through the options." },
        { question: "Is there an entrance assessment?", answer: "For Primary and Secondary, there's a short, friendly assessment so we can place your child in the right class. Early Years has a play visit instead." },
        { question: "Can we visit before applying?", answer: "Yes — we'd love to show you around. Visits run on weekday mornings; choose “Book a visit” in the form below." },
        { question: "Do you offer transport and meals?", answer: "Ask the admissions team about current bus routes and the lunch menu when you visit." },
      ],
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

const educationAbout: PageData = {
  seo: { title: "About Brightway", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Small classes, big ambitions",
      subtext: "Brightway began as a small tutoring centre run by two teachers. Today we're a full school — but every learner is still known by name.",
      ctaText: "Apply now",
      ctaHref: "",
    },
    {
      type: "backed_by",
      title: "Memberships & partners",
      logos: [
        { name: "Registered exam centre", url: null },
        { name: "University outreach partner", url: null },
        { name: "Parent–teacher association", url: null },
      ],
    },
    {
      type: "richtext",
      title: "Our approach",
      body: "<p>We believe children learn best when they feel safe, seen and a little bit challenged. Every class is planned around how each learner is doing — not just the syllabus.</p><ul><li>Small classes so teachers can give real attention</li><li>Regular progress reports and parent meetings</li><li>Clubs, sport and the arts alongside core subjects</li></ul>",
    },
    {
      type: "values",
      items: [
        { title: "Small classes", desc: "Teachers have time for every learner, every lesson." },
        { title: "Caring teachers", desc: "Qualified, patient and genuinely invested in progress." },
        { title: "Clear progress reports", desc: "You always know how your child is doing and what's next." },
        { title: "Safe, bright campus", desc: "Secure grounds, airy classrooms and space to play." },
      ],
    },
    {
      type: "team",
      title: "Meet our teachers",
      subtitle: "Experienced, kind and always learning themselves.",
      members: [
        { name: "Mrs. Ngozi Adeyemi", role: "Head teacher", bio: "A lifelong teacher who still leads a reading group every week.", photoUrl: person(8), linkedinUrl: "" },
        { name: "Mr. Daniel Okon", role: "Maths & Science", bio: "Turns tricky equations into puzzles worth solving.", photoUrl: person(3), linkedinUrl: "" },
        { name: "Ms. Amaka Eze", role: "Early Years lead", bio: "Songs, stories and endless patience for our youngest learners.", photoUrl: person(2), linkedinUrl: "" },
        { name: "Mr. Kunle Ajayi", role: "Coding & Robotics", bio: "Runs the after-school club and the annual build day.", photoUrl: person(13), linkedinUrl: "" },
      ],
    },
    {
      type: "gallery",
      title: "Around the school",
      images: [edu(3), edu(8), edu(6), edu(9)],
    },
    { type: "contact_card", showForm: false, mapLink: "" },
  ],
};

const educationContact: PageData = {
  seo: { title: "Admissions & contact", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Come and see us today",
      subtext: "Send an enquiry below, book a visit, or call the admissions office — we're happy to answer any question.",
      ctaText: "Apply now",
      ctaHref: "#apply",
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

function educationSite(): TemplateProps {
  const base = sampleSiteBase("t10");
  return {
    ...base,
    profile: {
      ...base.profile,
      business_name: "Brightway Academy",
      tagline: "Nursery, primary and secondary learning in Yaba, Lagos.",
      description: "Independent school for ages 3 to 18, with after-school clubs and weekend tutoring.",
      address: "8 Herbert Macaulay Way, Yaba, Lagos",
      phone: "+234 802 555 0193",
      email: "admissions@brightwayacademy.ng",
      whatsapp: "+2348025550193",
      socials: {
        instagram: "https://instagram.com",
        facebook: "https://facebook.com",
        youtube: "https://youtube.com",
        hours: "Mon–Fri · 07:30–16:00\nSaturday · 09:00–13:00\nSunday · Closed",
      },
    },
    pages: { home: educationHome, about: educationAbout, contact: educationContact },
  };
}

const ev = (i: number) => {
  const p = STOCK_PHOTOS.events[i % STOCK_PHOTOS.events.length]!;
  return { url: photoUrl(p.id), alt: p.alt };
};

const eventsHome: PageData = {
  seo: { title: "Velvet Hour Events — weddings, parties and launches in Lagos", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Let's make it a night to remember.",
      subtext: "Weddings, birthdays, launches and dinners in Lagos — planned, styled and run by one friendly crew, so you can be a guest at your own party.",
      ctaText: "Plan your event",
      ctaHref: "",
    },
    {
      type: "services",
      items: [
        { title: "Full wedding planning", desc: "From the venue search to the last dance: vendors, timeline, styling and a coordinator on the day." },
        { title: "Day-of coordination", desc: "You've done the planning; we take over in the final weeks and run the day so you can enjoy it." },
        { title: "Birthdays & milestones", desc: "Intimate dinners to big 50ths — themes, décor, cake and entertainment sorted." },
        { title: "Corporate events & launches", desc: "Product launches, end-of-year parties and conferences, with staging and guest management." },
        { title: "Styling & décor", desc: "Florals, lighting, tablescapes and backdrops designed around your colours and venue." },
        { title: "Catering & bar", desc: "Menus from caterers we trust, plus a bar service with signature cocktails and mocktails." },
      ],
    },
    {
      type: "values",
      items: [
        { title: "Tell us the idea", desc: "Share the occasion, the date, a rough guest count and the feeling you're after." },
        { title: "Get your plan", desc: "We put together a proposal with venue ideas, vendors and a timeline for you to approve." },
        { title: "We bring it to life", desc: "Our crew handles bookings, set-up, styling and the run of the day." },
        { title: "You enjoy it", desc: "Be present with your guests while we look after everything, right through to pack-down." },
      ],
    },
    {
      type: "use_cases",
      title: "Occasions we love",
      description: "Big or small, indoors or under the stars — tell us what you're celebrating.",
      items: [
        { title: "Weddings & engagements", description: "Traditional, white or both — one plan that flows from the first toast to the send-off.", linkText: "Plan a wedding", linkHref: "" },
        { title: "Birthdays & anniversaries", description: "Surprise parties, milestone dinners and themed celebrations for every age.", linkText: "Plan a birthday", linkHref: "" },
        { title: "Corporate & launches", description: "Launch nights, awards dinners and team celebrations that feel on-brand.", linkText: "Plan a corporate event", linkHref: "" },
      ],
    },
    {
      type: "gallery",
      title: "Past events",
      images: [ev(1), ev(8), ev(2), ev(10), ev(0), ev(11), ev(3)],
    },
    {
      type: "testimonials",
      title: "Kind words from our guests",
      items: [
        { name: "Funmi & Tayo", role: "Wedding", company: "", quote: "We didn't worry about a single thing on the day. Every detail we'd dreamed of was there — and a few we hadn't thought of." },
        { name: "Ngozi A.", role: "50th birthday", company: "", quote: "The décor was stunning and the night ran perfectly. My guests are still asking who planned it." },
        { name: "Daniel K.", role: "Product launch", company: "", quote: "Calm, organised and creative. They handled staging, guests and timing so our team could focus on the launch." },
        { name: "Amaka O.", role: "Engagement dinner", company: "", quote: "Small, intimate and so beautiful. They listened to exactly what we wanted and made it feel like us." },
      ],
    },
    {
      type: "faq",
      title: "Good to know",
      items: [
        { question: "How far in advance should we book?", answer: "As early as you can for weddings and large events, especially in busy seasons. For smaller parties a few weeks is often enough — just ask." },
        { question: "Do you only plan events in Lagos?", answer: "Most of our events are in and around Lagos, but we're happy to talk about events further afield." },
        { question: "Can we use our own vendors?", answer: "Of course. We can work alongside vendors you already love, or recommend ones we trust." },
        { question: "How does pricing work?", answer: "Every event is different, so we quote after a short chat about your date, guest count and plans." },
      ],
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

const eventsAbout: PageData = {
  seo: { title: "About Velvet Hour", description: "" },
  sections: [
    {
      type: "hero",
      headline: "A small crew with a big love for parties",
      subtext: "Velvet Hour started with a few friends planning each other's weddings. Today we plan celebrations across Lagos — with the same care and the same eye for detail.",
      ctaText: "Plan your event",
      ctaHref: "",
    },
    {
      type: "richtext",
      title: "How we work",
      body: "<p>Every event starts with a conversation. We listen to what you're celebrating and who's coming, then shape a plan that fits your style and your budget.</p><ul><li>One lead planner from first call to final toast</li><li>Vendors we know and trust — or yours, if you prefer</li><li>A clear timeline, so you always know what's next</li></ul>",
    },
    {
      type: "backed_by",
      title: "Partners & friends",
      logos: [
        { name: "Partner venues across Lagos", url: null },
        { name: "Trusted caterers", url: null },
        { name: "Local florists & bakers", url: null },
      ],
    },
    {
      type: "team",
      title: "Meet the crew",
      subtitle: "Planners, stylists and coordinators who love a good party.",
      members: [
        { name: "Tolu Bakare", role: "Founder & lead planner", bio: "Has never met a seating chart she couldn't solve.", photoUrl: person(5), linkedinUrl: "" },
        { name: "Emeka Nwosu", role: "Production", bio: "Sound, lights and staging — and always the first on site.", photoUrl: person(12), linkedinUrl: "" },
        { name: "Zainab Bello", role: "Styling & décor", bio: "Turns mood boards into rooms people remember.", photoUrl: person(15), linkedinUrl: "" },
        { name: "Seyi Martins", role: "Day-of coordinator", bio: "Keeps the run of show on time with a smile.", photoUrl: person(13), linkedinUrl: "" },
      ],
    },
    {
      type: "gallery",
      title: "More moments",
      images: [ev(9), ev(4), ev(6), ev(5)],
    },
    { type: "contact_card", showForm: false, mapLink: "" },
  ],
};

const eventsContact: PageData = {
  seo: { title: "Plan your event", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Let's start planning",
      subtext: "Tell us about your event with the form below, or call, WhatsApp or email us — we love hearing new ideas.",
      ctaText: "Plan your event",
      ctaHref: "#plan",
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

function eventsSite(): TemplateProps {
  const base = sampleSiteBase("t11");
  return {
    ...base,
    profile: {
      ...base.profile,
      business_name: "Velvet Hour Events",
      tagline: "Weddings, parties and launches, planned and styled in Lagos.",
      description: "Event planning, styling and coordination for weddings, birthdays and corporate events.",
      address: "5 Bourdillon Road, Ikoyi, Lagos",
      phone: "+234 803 555 0128",
      email: "hello@velvethourevents.ng",
      whatsapp: "+2348035550128",
      socials: {
        instagram: "https://instagram.com",
        tiktok: "https://tiktok.com",
        facebook: "https://facebook.com",
        hours: "Mon–Fri · 09:00–18:00\nSaturday · 10:00–16:00\nSunday · By appointment",
      },
    },
    pages: { home: eventsHome, about: eventsAbout, contact: eventsContact },
  };
}

const build = (i: number) => {
  const p = STOCK_PHOTOS.construction[i % STOCK_PHOTOS.construction.length]!;
  return { url: photoUrl(p.id), alt: p.alt };
};

const tradesHome: PageData = {
  seo: { title: "Ironwood Builders — renovations, repairs and building work in Lagos", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Built right. Built to last.",
      subtext: "Renovations, extensions, electrical and plumbing work across Lagos — one reliable crew, clear quotes and tidy sites.",
      ctaText: "Request a quote",
      ctaHref: "",
    },
    {
      type: "services",
      items: [
        { title: "Home renovations", desc: "Full and partial refurbishments — layouts, finishes and everything in between." },
        { title: "Extensions & new builds", desc: "From foundations to roof, managed by one team from start to handover." },
        { title: "Electrical wiring", desc: "Rewiring, new circuits, lighting and safety checks by qualified electricians." },
        { title: "Plumbing & water", desc: "Leaks, new bathrooms, water tanks, pumps and drainage, done properly." },
        { title: "Kitchens & bathrooms", desc: "Design, supply and fit — tiling, cabinets, fittings and finishing." },
        { title: "Painting & finishing", desc: "Interior and exterior painting, plastering and screeding with clean lines." },
      ],
    },
    {
      type: "values",
      items: [
        { title: "Tell us about the job", desc: "Call, WhatsApp or send the quote form with a few details and photos if you have them." },
        { title: "Site visit", desc: "We come and look at the work, take measurements and talk through options." },
        { title: "Clear written quote", desc: "You get an itemised price and a timeline before any work starts." },
        { title: "Build & handover", desc: "We do the work, keep you updated, clean up and walk you through the finished job." },
      ],
    },
    {
      type: "use_cases",
      title: "Recent projects",
      description: "A few jobs from the last season — from single rooms to whole houses.",
      items: [
        { title: "Duplex renovation, Lekki", description: "New layout downstairs, rewiring throughout and a full repaint inside and out.", linkText: "Start a similar project", linkHref: "" },
        { title: "Two-room extension, Ikeja", description: "Foundations, blockwork, roofing and finishing for a ground-floor extension.", linkText: "Start a similar project", linkHref: "" },
        { title: "Bathroom refit, Surulere", description: "Stripped back to the walls: new plumbing, tiling, fittings and ventilation.", linkText: "Start a similar project", linkHref: "" },
      ],
    },
    {
      type: "gallery",
      title: "On site",
      images: [build(0), build(3), build(5), build(7), build(1), build(6)],
    },
    {
      type: "testimonials",
      title: "What customers say",
      items: [
        { name: "Mrs. Adebayo", role: "Home renovation", company: "", quote: "They turned up when they said they would, kept the site tidy and finished the job properly. The written quote matched the final bill." },
        { name: "Tunde O.", role: "Extension", company: "", quote: "Clear about every step from foundations to roof. We always knew what was happening next." },
        { name: "Grace E.", role: "Bathroom refit", company: "", quote: "Fixed a leak two other plumbers couldn't find, then redid the whole bathroom beautifully." },
      ],
    },
    {
      type: "faq",
      title: "Common questions",
      items: [
        { question: "How do quotes work?", answer: "Send us a few details and we'll arrange a site visit. After that you get a written, itemised quote and a timeline." },
        { question: "Do you handle permits and approvals?", answer: "We can guide you through what your job needs and help prepare the paperwork where required." },
        { question: "Can you work while we live in the house?", answer: "Usually, yes. We plan the work in stages, protect floors and furniture, and clean up at the end of each day." },
        { question: "Which areas do you cover?", answer: "Most of our jobs are across Lagos. Further afield? Ask us — it depends on the size of the job." },
      ],
    },
    { type: "contact_card", showForm: false, mapLink: "" },
  ],
};

const tradesAbout: PageData = {
  seo: { title: "About Ironwood Builders", description: "" },
  sections: [
    {
      type: "hero",
      headline: "A local crew that shows up and does it right",
      subtext: "Builders, electricians and plumbers working as one team — so your job has one point of contact from first visit to handover.",
      ctaText: "Request a quote",
      ctaHref: "",
    },
    {
      type: "richtext",
      title: "How we work",
      body: "<p>Every job starts with a site visit and a straight conversation about what you need, what it will cost and how long it will take.</p><ul><li>One site lead from start to finish</li><li>Written, itemised quotes before any work starts</li><li>Tidy sites, protected floors and a clean handover</li></ul>",
    },
    {
      type: "backed_by",
      title: "Credentials",
      logos: [
        { name: "Registered with the state builders' board", url: null },
        { name: "Qualified electricians on every wiring job", url: null },
        { name: "Health & safety trained crews", url: null },
        { name: "Public liability insurance", url: null },
      ],
    },
    {
      type: "team",
      title: "Meet the crew",
      subtitle: "The people who'll be on your site.",
      members: [
        { name: "Chidi Okeke", role: "Founder & site lead", bio: "Runs every job from first visit to handover.", photoUrl: person(13), linkedinUrl: "" },
        { name: "Bisi Adeyemi", role: "Projects & quotes", bio: "Plans schedules and keeps customers in the loop.", photoUrl: person(1), linkedinUrl: "" },
        { name: "Kunle Ojo", role: "Lead electrician", bio: "Rewiring, lighting and safety checks.", photoUrl: person(0), linkedinUrl: "" },
        { name: "Halima Musa", role: "Interiors & finishing", bio: "Tiling, painting and the details that finish a room.", photoUrl: person(9), linkedinUrl: "" },
      ],
    },
    {
      type: "gallery",
      title: "Plans to handover",
      images: [build(8), build(11), build(4)],
    },
    { type: "contact_card", showForm: false, mapLink: "" },
  ],
};

const tradesContact: PageData = {
  seo: { title: "Request a quote", description: "" },
  sections: [
    {
      type: "hero",
      headline: "Let's talk about your job",
      subtext: "Send the quote form below, or call, WhatsApp or email us. We'll get back to you to arrange a visit.",
      ctaText: "Request a quote",
      ctaHref: "#quote",
    },
    { type: "contact_card", showForm: true, mapLink: "" },
  ],
};

function tradesSite(): TemplateProps {
  const base = sampleSiteBase("t12");
  return {
    ...base,
    profile: {
      ...base.profile,
      business_name: "Ironwood Builders",
      tagline: "Renovations, extensions, electrical and plumbing work across Lagos.",
      description: "Building, renovation, electrical and plumbing services for homes and small businesses.",
      address: "14 Industrial Avenue, Ikeja, Lagos",
      phone: "+234 803 555 0142",
      email: "hello@ironwoodbuilders.ng",
      whatsapp: "+2348035550142",
      socials: {
        facebook: "https://facebook.com",
        instagram: "https://instagram.com",
        hours: "Mon–Fri · 07:30–17:30\nSaturday · 08:00–13:00\nSunday · Closed",
        licence: "Licensed & insured",
      },
    },
    pages: { home: tradesHome, about: tradesAbout, contact: tradesContact },
  };
}

/** Sample site with stock photos filled in, the same way AI-generated sites get them. */
export function sampleSite(templateKey: string): TemplateProps {
  const base =
    templateKey === "t4"
      ? productSite()
      : templateKey === "t6"
        ? estateSite()
        : templateKey === "t5"
          ? beautySite()
          : templateKey === "t7"
            ? restaurantSite()
            : templateKey === "t8"
              ? clinicSite()
              : templateKey === "t9"
                ? fitnessSite()
                : templateKey === "t10"
                  ? educationSite()
                  : templateKey === "t11"
                    ? eventsSite()
                    : templateKey === "t12"
                      ? tradesSite()
                      : sampleSiteBase(templateKey);
  return { ...base, pages: fillSiteImages(base.pages, categoryForTemplate(templateKey), `sample-${templateKey}`) };
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
    navPages: getPagePresets(templateKey).map((p) => ({ key: p.key, label: p.label })),
  };
}

/**
 * Builds an extra page from the template's preset, reusing the sample site's own
 * sections (first match by type across home/about/contact) so previews aren't blank.
 */
export function sampleExtraPage(templateKey: string, props: TemplateProps, key: string): PageData | null {
  const preset = getPagePresets(templateKey).find((p) => p.key === key);
  if (!preset) return null;
  const pool: Section[] = [props.pages.home, props.pages.about, props.pages.contact].flatMap((p) => p?.sections ?? []);
  const used = new Set<Section>();
  const sections = preset.sections.map((type, i): Section => {
    if (type === "hero" && i === 0) {
      return { ...defaultSection("hero"), headline: preset.headline || preset.label } as Section;
    }
    const found = pool.find((s) => s.type === type && !used.has(s));
    if (found) {
      used.add(found);
      return found;
    }
    return defaultSection(type);
  });
  return { seo: { title: preset.label, description: "" }, sections };
}

/**
 * Per-template sample catalogues for `/dev/templates/<key>/shop/...` previews. Shop templates
 * (t13 Mode, t14 Cartly) register a builder here; anything else gets the empty default.
 */
export const SHOP_SAMPLES: Record<string, (() => ShopData) | undefined> = {};

/** Generic empty-safe default: no products, so templates must render their empty states. */
function emptyShop(): ShopData {
  return {
    siteId: "sample",
    currency: "NGN",
    settings: { deliveryFeeKobo: 150000, pickupEnabled: true, pickupNote: "Pick up from our store, Mon-Sat 9am-5pm." },
    categories: [],
    products: [],
  };
}

export function sampleShop(templateKey: string): ShopData {
  return SHOP_SAMPLES[templateKey]?.() ?? emptyShop();
}
