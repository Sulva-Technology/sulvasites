import { blogLabelFor, readingMinutes } from "@/lib/blog/blogPath";
import type { BlogData, BlogPost } from "@/lib/blog/types";
import { categoryForTemplate, photoUrl, pickPhotos } from "@/lib/stockPhotos";

/** Sample blog posts for template previews (dev + admin gallery), no database needed. */

type SamplePost = { slug: string; title: string; excerpt: string; author: string; tags: string[]; featured?: boolean; body: string };

const P = (s: string) => `<p>${s}</p>`;

const BUSINESS_POSTS: SamplePost[] = [
  {
    slug: "five-questions-before-you-hire",
    title: "Five questions to ask before you hire anyone",
    excerpt: "A short checklist we share with every new client, so you know exactly what you are paying for and what happens next.",
    author: "Ada Okafor",
    tags: ["Guides", "Advice"],
    featured: true,
    body: [
      P("Hiring help for your business is a big decision. Before you sign anything, a few honest questions will save you time, money and a lot of back-and-forth."),
      "<h2>1. What exactly is included?</h2>",
      P("Ask for a written list of what you get, and what you don't. A clear scope is the single best predictor of a project that ends on time."),
      "<h2>2. Who will actually do the work?</h2>",
      P("Meet the people, not just the person who sells to you. You will be speaking to them every week."),
      "<blockquote>Good partners are happy to show their process. Great ones show you their mistakes too.</blockquote>",
      "<h2>3. How will we measure success?</h2>",
      P("Agree on one or two numbers that matter to you, whether that is enquiries, bookings or simply time saved."),
      "<ul><li>Agree on a start date and a review date</li><li>Know how you can reach the team</li><li>Know what happens if plans change</li></ul>",
      "<h2>4. What do you need from me?</h2>",
      P("Every project needs something from you: feedback, access, photos. Knowing this up front keeps things moving."),
      "<h2>5. What happens after?</h2>",
      P("Ask how support works once the work is delivered. The best relationships last long after the first invoice."),
    ].join(""),
  },
  {
    slug: "behind-the-scenes",
    title: "Behind the scenes: how a week with us really looks",
    excerpt: "From Monday planning to Friday wrap-ups, here is the rhythm that keeps our work calm, clear and on time.",
    author: "Tunde Bello",
    tags: ["Company", "Process"],
    body: [
      P("People often ask what happens between our first call and the finished result. Here is an honest look at a normal week."),
      "<h2>Monday: plan</h2>",
      P("We start every week by agreeing on the three things that matter most, and write them down where everyone can see them."),
      "<h2>Midweek: make</h2>",
      P("Most of the real work happens on Tuesday to Thursday. We keep meetings short and share progress early, even when it is rough."),
      "<h2>Friday: review</h2>",
      P("Every Friday you get a short update: what is done, what is next, and anything we need from you."),
    ].join(""),
  },
  {
    slug: "what-customers-taught-us",
    title: "What our customers taught us this year",
    excerpt: "Twelve months, hundreds of conversations and a few surprises. The lessons we are taking into next year.",
    author: "Ada Okafor",
    tags: ["Company", "Customers"],
    body: [
      P("This year we listened more than ever. Here are the lessons that changed how we work."),
      "<h3>Speed matters, but clarity matters more</h3>",
      P("Customers forgive a slower answer when it is a clear one. We now reply with a plan, not just a time."),
      "<h3>Small details build trust</h3>",
      P("A tidy invoice, a quick reminder, a follow-up call. The little things were mentioned more than anything else in our reviews."),
    ].join(""),
  },
  {
    slug: "getting-started-guide",
    title: "A simple guide to getting started",
    excerpt: "Never worked with us before? This is everything you need to know, in plain English, in under five minutes.",
    author: "Tunde Bello",
    tags: ["Guides"],
    body: [
      P("Getting started is easier than you think. Here is the whole process from first message to first result."),
      "<ol><li>Send us a message with what you need</li><li>We reply within one working day with questions and a rough price</li><li>We agree on a plan and a start date</li><li>We get to work and keep you posted every week</li></ol>",
      P("That is it. No long forms, no jargon, and no surprises."),
    ].join(""),
  },
  {
    slug: "new-opening-hours",
    title: "News: longer opening hours from next month",
    excerpt: "You asked, we listened. From next month we are open later on weekdays and on Saturday mornings too.",
    author: "Team",
    tags: ["News"],
    body: [
      P("Good news for everyone who has asked us to stay open a little longer. From the first of next month our new hours are:"),
      "<ul><li>Monday to Friday: 8am to 7pm</li><li>Saturday: 9am to 1pm</li></ul>",
      P("As always, you can message us any time and we will reply the next working day."),
    ].join(""),
  },
  {
    slug: "tools-we-love",
    title: "The tools our team cannot live without",
    excerpt: "The apps, notebooks and habits that help a small team do big work, and why we picked them.",
    author: "Ada Okafor",
    tags: ["Process", "Advice"],
    body: [
      P("We are often asked what we use to stay organised. The honest answer: fewer tools than you would think."),
      "<h2>A shared calendar</h2>",
      P("Everything with a date goes in the calendar. If it is not there, it is not happening."),
      "<h2>One list per project</h2>",
      P("Each project gets one list of tasks that the whole team and the client can see."),
    ].join(""),
  },
  {
    slug: "community-day",
    title: "Giving back: our first community day",
    excerpt: "Last month the whole team spent a day volunteering locally. Here is what we did and why we will do it again.",
    author: "Tunde Bello",
    tags: ["Community", "News"],
    body: [
      P("Last month we closed for a day and spent it with a local school, helping with repairs, reading sessions and lunch."),
      P("It was one of the best days we have had as a team, and we are already planning the next one."),
    ].join(""),
  },
];

/** A writer / publication's journal for the blog-first template (t17). */
const JOURNAL_POSTS: SamplePost[] = [
  {
    slug: "the-quiet-power-of-doing-less",
    title: "The quiet power of doing less",
    excerpt: "On cutting the list in half, protecting the mornings, and why the most productive weeks often look empty from the outside.",
    author: "Amara Nwosu",
    tags: ["Essays", "Work"],
    featured: true,
    body: [
      P("For years I measured a good day by how much I crossed off. Long lists, short nights, a constant hum of motion. It took a slow, almost accidental summer to show me how little of it mattered."),
      "<h2>The list that ate the week</h2>",
      P("A to-do list is a promise to your future self. Most of mine were promises I had no intention of keeping. They sat there, gently accusing, while the one thing that mattered waited at the bottom."),
      "<blockquote>The work that changes things rarely announces itself. It waits for a quiet morning and a closed door.</blockquote>",
      "<h2>Protecting the mornings</h2>",
      P("Now the first three hours of the day belong to one task. No messages, no meetings, no news. It felt indulgent at first. It turned out to be the most practical decision I have made."),
      "<ul><li>One important thing before noon</li><li>Messages in two batches, not twenty</li><li>A walk instead of another call</li></ul>",
      "<h2>Empty is not idle</h2>",
      P("From the outside, my best weeks now look almost empty. Inside them, the work is deeper than it has ever been. Doing less, it turns out, is a skill. And like any skill, it gets easier with practice."),
    ].join(""),
  },
  {
    slug: "notes-from-a-lagos-morning",
    title: "Notes from a Lagos morning",
    excerpt: "Danfo horns, roasting corn and the first light over the lagoon. A city that starts before the sun and never quite stops.",
    author: "Amara Nwosu",
    tags: ["Places", "Essays"],
    body: [
      P("Lagos wakes before the sun. By five the roads are already arguing, and by six the whole city has an opinion about the day."),
      "<h2>The sound of the city</h2>",
      P("If you listen closely, the noise becomes music: the conductor's call, the hiss of the corn seller's grill, the radio playing highlife from a kiosk."),
      P("It is chaotic, generous and impossible to ignore. I would not write anywhere else."),
    ].join(""),
  },
  {
    slug: "reading-list-autumn",
    title: "What I am reading this season",
    excerpt: "Six books that have kept me up too late recently, from sweeping family sagas to a tiny book about walking.",
    author: "Amara Nwosu",
    tags: ["Books"],
    body: [
      P("A seasonal habit: the books on my bedside table, and why each one earned its place."),
      "<ol><li>A sweeping family saga set across three generations</li><li>A slim, perfect book of essays on attention</li><li>A novel about a lighthouse keeper and his letters</li><li>A field guide to the birds of West Africa</li><li>A memoir about learning to cook late in life</li><li>A tiny book about walking</li></ol>",
    ].join(""),
  },
  {
    slug: "on-writing-every-day",
    title: "On writing every day, even badly",
    excerpt: "Three hundred words before breakfast. Most of them are not good. That is exactly the point.",
    author: "Amara Nwosu",
    tags: ["Writing", "Work"],
    body: [
      P("I write three hundred words every morning. Most are terrible. Some are fine. Every so often, one sentence is worth the whole month."),
      "<h2>Showing up is the work</h2>",
      P("The habit is not about the words. It is about being at the desk when the good ones arrive."),
    ].join(""),
  },
  {
    slug: "the-case-for-slow-travel",
    title: "The case for slow travel",
    excerpt: "Two weeks in one small town taught me more than any ten-city tour. A gentle argument for staying put.",
    author: "Kelechi Obi",
    tags: ["Places", "Travel"],
    body: [
      P("We once tried to see six cities in ten days. I remember airports. Last year we spent two weeks in one small coastal town, and I remember everything."),
      P("Slow travel is not about doing less. It is about letting a place happen to you."),
    ].join(""),
  },
  {
    slug: "letters-to-a-young-writer",
    title: "Letters to a young writer",
    excerpt: "The advice I wish someone had given me at twenty, gathered from a decade of rejections and a few small wins.",
    author: "Amara Nwosu",
    tags: ["Writing"],
    body: [
      P("Dear friend, you asked what I would tell my younger self. Here is the short version: read more, publish sooner, and keep your rejections in a folder you are proud of."),
    ].join(""),
  },
  {
    slug: "kitchen-table-conversations",
    title: "Kitchen table conversations",
    excerpt: "My grandmother never wrote anything down. Recording her stories became the most important project of my life.",
    author: "Kelechi Obi",
    tags: ["Family", "Essays"],
    body: [
      P("Every Sunday for a year, I sat at my grandmother's kitchen table with a small recorder and a pot of tea."),
      P("What began as a family project became an archive of a life, a village and a language that is slowly slipping away."),
    ].join(""),
  },
  {
    slug: "a-year-of-small-notebooks",
    title: "A year of small notebooks",
    excerpt: "Twelve pocket notebooks, one for each month. What I wrote in them, and what I learned from reading them back.",
    author: "Amara Nwosu",
    tags: ["Writing", "Work"],
    body: [P("I carried a pocket notebook every day for a year. Reading them back in December was like meeting an old friend who remembered everything.")].join(""),
  },
];

const DAY = 86_400_000;
const ANCHOR = Date.UTC(2026, 8, 30, 9, 0, 0); // fixed so previews render the same on server and client

export function sampleBlog(templateKey: string): { blog: BlogData; bodies: Record<string, string> } {
  const source = templateKey === "t17" ? JOURNAL_POSTS : BUSINESS_POSTS;
  const photos = pickPhotos(categoryForTemplate(templateKey), source.length, `blog-${templateKey}`);
  const bodies: Record<string, string> = {};
  const posts: BlogPost[] = source.map((p, i) => {
    bodies[p.slug] = p.body;
    const photo = photos[i];
    const at = new Date(ANCHOR - i * 9 * DAY).toISOString();
    return {
      id: `sample-${i}`,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      // Every third post has no cover, to show the text-only card.
      coverUrl: photo && i % 3 !== 2 ? photoUrl(photo.id, 1600) : null,
      coverAlt: photo?.alt ?? "",
      authorName: p.author,
      tags: p.tags,
      featured: !!p.featured,
      publishedAt: at,
      updatedAt: at,
      readMinutes: readingMinutes(p.body),
      seoTitle: "",
      seoDescription: "",
    };
  });
  return { blog: { siteId: "sample", label: blogLabelFor(templateKey), posts }, bodies };
}
