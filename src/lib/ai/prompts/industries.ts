// Per-industry writing guidance, keyed by template key (see TEMPLATE_META categories).
// Pure data. Relative imports only.
import type { Section } from "../../pageSchema.ts";
import type { PhotoCategory } from "../../stockPhotoData.ts";

export type SectionType = Section["type"];

export type IndustryGuide = {
  key: string;
  /** Matches TEMPLATE_META.category. */
  category: string;
  photoCategory: PhotoCategory;
  /** Lowercase keywords for the deterministic template fallback. Multi-word entries score higher. */
  keywords: string[];
  audience: string;
  /** What a visitor must learn within 5 seconds. */
  mustAnswer: string;
  /** Offers and details worth featuring (only when the owner supplied them). */
  features: string[];
  /** Trust signals that are safe to mention without inventing facts. */
  trust: string[];
  faqTopics: string[];
  ctas: string[];
  avoid: string[];
  /** What each section means for this industry. */
  roles: Partial<Record<SectionType, string>>;
  /** Generic, honest offer titles used only by the deterministic fallback. */
  fallbackOffers: string[];
  shop?: boolean;
};

export const INDUSTRIES: Record<string, IndustryGuide> = {
  t1: {
    key: "t1",
    category: "Corporate",
    photoCategory: "corporate",
    keywords: [
      "consultancy", "consulting", "consultant firm", "agency", "accounting", "accountant", "audit", "tax", "law firm", "lawyer", "legal", "insurance", "finance",
      "financial", "bank", "advisory", "recruitment", "hr", "professional services", "firm", "logistics", "freight", "shipping", "marketing agency", "business services",
    ],
    audience: "business owners and decision makers who compare providers on clarity and credibility",
    mustAnswer: "what problem you solve, for which kind of client, and how a first conversation starts",
    features: ["core service lines", "the process from first call to delivery", "industries or client types served", "how engagements are priced (only if stated)"],
    trust: ["clear process steps", "named service scope", "responsive contact route", "licences or registrations ONLY if the owner stated them"],
    faqTopics: ["how an engagement starts", "what information you need from the client", "how long projects typically take (only if stated)", "how to request a quote"],
    ctas: ["Book a consultation", "Request a quote", "Talk to us"],
    avoid: ["buzzwords", "vague promises of growth", "invented client logos or case-study numbers"],
    roles: {
      services: "the main service lines, one per item",
      values: "how the firm works with clients (process or principles)",
      use_cases: "typical client situations and how the firm helps (no invented client names)",
    },
    fallbackOffers: ["Advisory", "Project delivery", "Ongoing support"],
  },
  t2: {
    key: "t2",
    category: "Editorial",
    photoCategory: "creative",
    keywords: ["magazine", "media", "publication", "blog", "journal", "film", "videography", "podcast", "creative studio", "design studio", "photography studio", "editorial", "content studio", "photographer"],
    audience: "clients, readers and collaborators who judge by taste and storytelling",
    mustAnswer: "what you make, your point of view, and how to commission or follow the work",
    features: ["disciplines or formats", "selected projects or series", "how a commission works", "the studio's point of view"],
    trust: ["clear scope of work", "process from brief to delivery", "publications or clients ONLY if stated"],
    faqTopics: ["how to commission work", "turnaround (only if stated)", "usage rights", "how to contact for collaborations"],
    ctas: ["Start a project", "See the work", "Get in touch"],
    avoid: ["pretentious language", "invented clients or press mentions"],
    roles: {
      services: "what the studio makes or offers",
      values: "creative principles or how the studio works",
      use_cases: "types of project or story the studio takes on (no invented client names)",
    },
    fallbackOffers: ["Concept and direction", "Production", "Delivery and support"],
  },
  t3: {
    key: "t3",
    category: "Portfolio",
    photoCategory: "creative",
    keywords: ["freelancer", "freelance", "portfolio", "personal brand", "designer", "developer", "writer", "copywriter", "artist", "illustrator", "speaker", "founder", "life coach", "career coach", "consultant"],
    audience: "prospective clients and employers who want proof of skill and an easy way to hire one person",
    mustAnswer: "what you do best, who you do it for, and how to hire you",
    features: ["areas of expertise", "ways to work together", "process", "tools or specialities the owner named"],
    trust: ["clear scope and process", "personal voice in first person singular if the owner is one person", "past employers or clients ONLY if stated"],
    faqTopics: ["how to start a project", "availability (only if stated)", "how pricing works (only if stated)", "what you need from the client"],
    ctas: ["Hire me", "Start a project", "Say hello"],
    avoid: ["boasting without evidence", "'we' when the owner is one person"],
    roles: {
      services: "ways to work together or skills offered",
      values: "working principles",
      use_cases: "kinds of project taken on (no invented client names)",
    },
    fallbackOffers: ["Project work", "Ongoing collaboration", "Consultation"],
  },
  t4: {
    key: "t4",
    category: "Product / app",
    photoCategory: "tech",
    keywords: ["startup", "app", "saas", "software", "platform", "product launch", "mobile app", "web app", "api", "dashboard", "ai tool", "fintech app", "waitlist"],
    audience: "people who will try or buy a digital product if the value is obvious fast",
    mustAnswer: "what the product does, who it is for, and the single next step (try, sign up, join waitlist)",
    features: ["the main problem solved", "3-4 key features as outcomes", "how it works in simple steps", "who it is for"],
    trust: ["clear how-it-works steps", "support route", "security or pricing claims ONLY if stated"],
    faqTopics: ["who the product is for", "how to get started", "pricing (only if stated)", "how to get support"],
    ctas: ["Get started", "Join the waitlist", "Request a demo"],
    avoid: ["feature lists without outcomes", "invented user counts, ratings or integrations"],
    roles: {
      services: "key features written as outcomes",
      values: "how it works in 3 simple steps or product principles",
      use_cases: "who uses it and for what job (no invented customers)",
    },
    fallbackOffers: ["Core features", "Easy setup", "Support"],
  },
  t5: {
    key: "t5",
    category: "Beauty & booking",
    photoCategory: "beauty",
    keywords: ["salon", "makeup", "make-up", "beauty", "spa", "barber", "barbershop", "nails", "nail tech", "lashes", "hair", "braids", "skincare", "massage", "bridal makeup", "makeup artist", "wig", "hairstylist", "gele"],
    audience: "clients who book by look, hygiene and convenience, often from a phone",
    mustAnswer: "which services you offer, what the result looks like, and how to book",
    features: ["service menu grouped by type", "how booking works (WhatsApp, call, form)", "bridal or event packages if stated", "products or brands used only if stated"],
    trust: ["hygiene and clean tools wording only if stated", "how to book and what to bring", "deposit or cancellation policy ONLY if stated"],
    faqTopics: ["how to book", "deposit or cancellation (only if stated)", "how long an appointment takes (only if stated)", "do you travel to clients (only if stated)"],
    ctas: ["Book now", "Book an appointment", "Message us on WhatsApp"],
    avoid: ["invented prices", "medical or guaranteed-result claims", "invented before-and-after claims"],
    roles: {
      services: "the treatments or services offered, one per item",
      values: "what clients can expect at each visit",
      use_cases: "occasions the services suit (bridal, events, everyday) without invented clients",
    },
    fallbackOffers: ["Signature services", "Special occasions", "Appointments"],
  },
  t6: {
    key: "t6",
    category: "Real estate",
    photoCategory: "real_estate",
    keywords: ["real estate", "property", "properties", "estate agent", "realtor", "landlord", "housing", "land", "apartments", "rentals", "estate developer", "property management", "lettings", "shortlet", "short-let"],
    audience: "buyers, renters and landlords who need trust, clear process and fast replies",
    mustAnswer: "what you list or manage, where, and how to enquire or book a viewing",
    features: ["property types and areas served", "buying, renting and management services", "viewing and enquiry process", "document or title checks ONLY if stated"],
    trust: ["clear step-by-step process", "areas served as stated", "registrations or licences ONLY if stated"],
    faqTopics: ["how to book a viewing", "what documents are needed (general)", "how enquiries are handled", "areas covered"],
    ctas: ["Book a viewing", "Enquire now", "Talk to an agent"],
    avoid: ["invented listings, prices, sizes or addresses", "guaranteed returns", "fake title or approval claims"],
    roles: {
      services: "services offered (sales, lettings, management, valuation)",
      values: "how the agency protects clients through the process",
      use_cases: "client situations: first-time buyer, landlord, investor (no invented listings)",
    },
    fallbackOffers: ["Property sales", "Lettings", "Property management"],
  },
  t7: {
    key: "t7",
    category: "Restaurant",
    photoCategory: "food",
    keywords: ["restaurant", "cafe", "café", "bakery", "catering", "caterer", "food", "kitchen", "bar", "grill", "buka", "canteen", "pastry", "cakes", "eatery", "lounge", "chop", "suya", "coffee shop", "bistro"],
    audience: "hungry people deciding where to eat or order, usually on a phone",
    mustAnswer: "what food you serve, where you are, and how to order or book a table",
    features: ["signature dishes or product categories named by the owner", "dine-in, takeaway, delivery or catering options", "ordering or reservation route", "opening hours ONLY if stated"],
    trust: ["freshness and preparation wording only if the owner said it", "how to order", "location"],
    faqTopics: ["how to order or reserve", "delivery or pick-up (only if stated)", "catering and bulk orders (only if stated)", "dietary needs (only if stated)"],
    ctas: ["Order now", "Reserve a table", "Call to order"],
    avoid: ["invented menu prices", "invented dishes not mentioned", "'best in town' claims"],
    roles: {
      services: "menu highlights or product categories, one per item",
      values: "what makes the food or experience distinct (ingredients, method, atmosphere) using only stated details",
      use_cases: "ways to enjoy it: dine-in, takeaway, events, catering",
    },
    fallbackOffers: ["Dine-in", "Takeaway", "Catering"],
  },
  t8: {
    key: "t8",
    category: "Clinic & health",
    photoCategory: "clinic",
    keywords: ["clinic", "hospital", "dentist", "dental", "pharmacy", "doctor", "health", "physio", "physiotherapy", "wellness", "medical", "optician", "laboratory", "diagnostics", "therapy", "counselling", "counseling", "maternity", "paediatric"],
    audience: "patients and families who need reassurance, clarity and an easy way to book",
    mustAnswer: "which care you provide, who provides it, and how to book or get help",
    features: ["services and specialities named by the owner", "how to book or walk in", "what to expect at a first visit", "accepted insurance or HMOs ONLY if stated"],
    trust: ["qualified-staff wording only if stated", "privacy and clear process", "licences ONLY if stated"],
    faqTopics: ["how to book", "what to bring to a first visit", "payment or insurance (only if stated)", "emergencies: direct to local emergency services"],
    ctas: ["Book a visit", "Call the clinic", "Request an appointment"],
    avoid: ["medical claims, cures or guaranteed outcomes", "invented doctor names or credentials", "scare tactics"],
    roles: {
      services: "treatments and services offered, one per item, in plain language",
      values: "how patients are cared for (privacy, clarity, follow-up) without outcome claims",
      use_cases: "reasons patients visit (check-ups, family care, specific concerns)",
    },
    fallbackOffers: ["Consultations", "Treatments", "Follow-up care"],
  },
  t9: {
    key: "t9",
    category: "Fitness",
    photoCategory: "fitness",
    keywords: ["gym", "fitness", "personal trainer", "trainer", "yoga", "dance", "pilates", "crossfit", "boxing", "workout", "zumba", "aerobics", "bootcamp fitness", "martial arts"],
    audience: "people who want results and a place that feels motivating and safe",
    mustAnswer: "what training you offer, who it suits, and how to join or try a session",
    features: ["classes or training types", "levels from beginner up", "membership or session options (no prices unless stated)", "schedule only if stated"],
    trust: ["coach guidance wording only if stated", "beginner-friendly wording only if stated", "how to try a first session"],
    faqTopics: ["do I need experience", "how to join or book a trial", "what to bring", "class times (only if stated)"],
    ctas: ["Join today", "Book a free trial", "Message a coach"],
    avoid: ["body-shaming", "guaranteed weight-loss claims", "invented prices or class times"],
    roles: {
      services: "classes or training programmes offered",
      values: "what members get: coaching, community, progress",
      use_cases: "goals people come with: strength, weight, flexibility, confidence",
    },
    fallbackOffers: ["Group classes", "Personal training", "Memberships"],
  },
  t10: {
    key: "t10",
    category: "Education",
    photoCategory: "education",
    keywords: ["school", "tutor", "tutoring", "academy", "training centre", "training center", "lessons", "course", "college", "nursery", "creche", "crèche", "education", "university", "bootcamp", "waec", "jamb", "coding school", "classes", "primary school", "secondary school"],
    audience: "parents and learners who compare schools by outcomes, safety and clarity of the process",
    mustAnswer: "what is taught, to whom, and how to enrol or enquire",
    features: ["programmes and levels", "teaching approach as stated", "admission or enrolment steps", "term dates and fees ONLY if stated"],
    trust: ["clear admission steps", "safe, supportive environment wording only if stated", "accreditations or exam results ONLY if stated"],
    faqTopics: ["how to enrol", "age or level requirements (only if stated)", "fees (only if stated)", "how to visit or contact"],
    ctas: ["Enquire about admission", "Book a visit", "Apply now"],
    avoid: ["invented pass rates, rankings or accreditations", "guaranteed results"],
    roles: {
      services: "programmes, subjects or courses offered",
      values: "learning approach and what students experience",
      use_cases: "who each programme is for (age, goal, level)",
    },
    fallbackOffers: ["Core programmes", "Extra lessons", "Admissions support"],
  },
  t11: {
    key: "t11",
    category: "Events",
    photoCategory: "events",
    keywords: ["event", "events", "wedding", "planner", "event planner", "venue", "party", "decor", "decoration", "mc", "dj", "celebration", "hall", "event centre", "event center", "rentals", "anniversary", "birthday", "bridal shower"],
    audience: "people planning an important day who need confidence the day will run smoothly",
    mustAnswer: "which events you handle, what is included, and how to start planning",
    features: ["event types", "planning, decor, venue or coordination services", "how planning starts", "packages (no prices unless stated)"],
    trust: ["clear planning steps", "day-of coordination wording only if stated", "past events ONLY if stated"],
    faqTopics: ["how far ahead to book", "how planning works", "can you work to a budget (no figures unless stated)", "how to request a quote"],
    ctas: ["Plan your event", "Request a quote", "Check your date"],
    avoid: ["invented past events, guest counts or prices", "pressure tactics"],
    roles: {
      services: "event types or services offered",
      values: "how the team keeps events stress-free",
      use_cases: "occasions served: weddings, birthdays, corporate events",
    },
    fallbackOffers: ["Event planning", "Decor and styling", "Day-of coordination"],
  },
  t12: {
    key: "t12",
    category: "Trades & construction",
    photoCategory: "construction",
    keywords: [
      "builder", "construction", "plumber", "plumbing", "electrician", "electrical", "renovation", "painter", "painting", "contractor", "carpentry", "carpenter", "roofing", "tiling",
      "hvac", "air conditioning", "generator", "installation", "repairs", "cleaning", "home services", "welding", "fabrication", "interior", "pop ceiling", "borehole", "solar", "inverter",
    ],
    audience: "homeowners and businesses who want a reliable tradesperson, a clear quote and no surprises",
    mustAnswer: "what work you do, where you work, and how to get a quote fast",
    features: ["services listed by job type", "areas covered as stated", "how a quote and site visit work", "emergency or same-day callouts ONLY if stated"],
    trust: ["clear quote and work process", "clean-up and communication wording only if stated", "licences, insurance or years ONLY if stated"],
    faqTopics: ["how to get a quote", "do you offer site visits (only if stated)", "areas covered", "how payment works (only if stated)"],
    ctas: ["Get a quote", "Call now", "Request a site visit"],
    avoid: ["invented years of experience, project counts or certifications", "fixed prices", "fear tactics"],
    roles: {
      services: "jobs and trades offered, one per item",
      values: "how work is done: quote first, clear updates, tidy site",
      use_cases: "typical jobs by customer type (homes, shops, offices)",
    },
    fallbackOffers: ["Installations", "Repairs", "Maintenance"],
  },
  t13: {
    key: "t13",
    category: "Fashion shop",
    photoCategory: "fashion",
    keywords: ["fashion", "boutique", "clothing", "clothes", "ankara", "aso ebi", "asoebi", "sneakers", "shoes", "bags", "wears", "thrift", "outfits", "tailoring", "streetwear", "lace", "jewellery", "jewelry"],
    audience: "shoppers who buy on look, fit and trust in delivery",
    mustAnswer: "what you sell, what style it is, and how to order and get delivery",
    features: ["collections or categories named by the owner", "how ordering and delivery work (only as stated)", "sizing and returns help", "custom orders only if stated"],
    trust: ["clear order and delivery steps", "payment via Paystack checkout is built in", "size guide"],
    faqTopics: ["sizing", "delivery (only as stated)", "returns or exchanges (only if stated)", "how to order"],
    ctas: ["Shop now", "Shop the collection", "Order on WhatsApp"],
    avoid: ["invented product names, prices, discounts or stock levels", "fake reviews"],
    roles: {
      services: "product categories or collections the shop focuses on (not individual products)",
      values: "why shoppers buy here: style, fit, care, delivery (only stated details)",
      use_cases: "ways to shop: by category, occasion or style",
    },
    fallbackOffers: ["New arrivals", "Everyday wear", "Occasion wear"],
    shop: true,
  },
  t14: {
    key: "t14",
    category: "General store",
    photoCategory: "retail",
    keywords: ["online store", "online shop", "retail", "retailer", "supermarket", "gadgets", "electronics", "groceries", "wholesale", "ecommerce", "e-commerce", "phones", "furniture", "cosmetics store", "mart", "provisions", "sell products", "sells products"],
    audience: "shoppers comparing price, choice and delivery reliability",
    mustAnswer: "what you sell, how to order, and how delivery and payment work",
    features: ["product categories named by the owner", "ordering, payment and delivery steps (only as stated)", "deals page for promotions only when real", "help and returns info (only if stated)"],
    trust: ["secure Paystack checkout is built in", "clear delivery and help page", "customer support route"],
    faqTopics: ["how to order", "delivery (only as stated)", "payment options", "returns (only if stated)"],
    ctas: ["Shop now", "Browse deals", "Contact support"],
    avoid: ["invented products, prices, discounts, stock or reviews", "fake urgency"],
    roles: {
      services: "product categories the store carries (not individual products)",
      values: "why shoppers buy here: range, support, delivery (only stated details)",
      use_cases: "ways to shop: by category, need or budget",
    },
    fallbackOffers: ["Popular categories", "Everyday essentials", "New arrivals"],
    shop: true,
  },
};

export const GENERIC_INDUSTRY: IndustryGuide = {
  key: "generic",
  category: "General",
  photoCategory: "general",
  keywords: [],
  audience: "local customers deciding quickly whether this business can help",
  mustAnswer: "what the business does, who it serves, and how to get in touch",
  features: ["the main services or products the owner named", "how to get started", "location served"],
  trust: ["clear process", "easy contact route"],
  faqTopics: ["how to get started", "areas served", "how to contact"],
  ctas: ["Get in touch", "Request a quote", "Call us"],
  avoid: ["invented facts of any kind"],
  roles: {},
  fallbackOffers: ["Our services", "How we work", "Support"],
};

export function getIndustry(templateKey: string | null | undefined): IndustryGuide {
  return (templateKey && INDUSTRIES[templateKey]) || GENERIC_INDUSTRY;
}

/** Compact industry block for a prompt. */
export function renderIndustryGuide(g: IndustryGuide): string {
  const roles = Object.entries(g.roles)
    .map(([type, text]) => `  - ${type}: ${text}`)
    .join("\n");
  return [
    `INDUSTRY GUIDE (${g.category})`,
    `- Audience: ${g.audience}.`,
    `- A visitor must learn within five seconds: ${g.mustAnswer}.`,
    `- Worth featuring when the owner gave details: ${g.features.join("; ")}.`,
    `- Safe trust signals: ${g.trust.join("; ")}.`,
    `- FAQ topics that matter: ${g.faqTopics.join("; ")}.`,
    `- Typical calls to action: ${g.ctas.join(" / ")}.`,
    `- Avoid: ${g.avoid.join("; ")}.`,
    roles ? `- What each section means here:\n${roles}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
