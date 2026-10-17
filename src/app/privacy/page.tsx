import type { Metadata } from "next";

import LegalPage from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy — Sulva Sites",
  description: "What personal data Sulva Sites collects, why, who we share it with and your choices.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        This explains how Sulvatech (&ldquo;we&rdquo;) handles personal data when you use Sulva Sites. We process it in line
        with the Nigeria Data Protection Act 2023.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><b>Account details:</b> your name, email address, phone number and password (stored hashed, never in plain text).</li>
        <li><b>Site content:</b> text, photos, logos, products and settings you add to your site.</li>
        <li><b>Billing records:</b> plan, payment references, amounts and dates. Card details are handled by Paystack and never reach us.</li>
        <li><b>Your visitors&rsquo; messages and orders:</b> when someone fills in a contact form or orders from a site you run, we store what they submit (such as name, email, phone, message, delivery details) so you can see it in your inbox and orders. For that data you decide what is collected, and we act on your behalf.</li>
        <li><b>Usage data:</b> privacy-friendly visit counts for site owners&rsquo; Insights, and technical logs (such as IP address and browser) kept to run and secure the service.</li>
      </ul>

      <h2>2. Why we use it</h2>
      <ul>
        <li>To provide, host and support your site and account.</li>
        <li>To take payments, send receipts and billing reminders.</li>
        <li>To keep the service secure and prevent abuse.</li>
        <li>To email you about your account and important changes. We do not sell your data.</li>
      </ul>

      <h2>3. Who we share it with</h2>
      <p>We use trusted providers to run Sulva Sites, and they only receive what they need:</p>
      <ul>
        <li><b>Supabase</b> for our database, sign-in and file storage.</li>
        <li><b>Vercel</b> for hosting.</li>
        <li><b>Paystack</b> for payments.</li>
        <li><b>Resend</b> for sending email.</li>
        <li><b>AI providers</b> (such as Google Gemini, OpenRouter and Groq) when you use the AI features. The text you type into those features is sent to them to produce a reply. Do not enter sensitive personal data there.</li>
        <li><b>Search engines</b> (Google, Bing and others) receive your published pages&rsquo; addresses so people can find your site.</li>
      </ul>
      <p>We may also disclose data where the law requires it.</p>

      <h2>4. Where it is stored</h2>
      <p>
        Our providers may store data outside Nigeria. Where that happens we rely on providers that apply appropriate
        safeguards for personal data.
      </p>

      <h2>5. How long we keep it</h2>
      <p>
        We keep your data while your account is active. If a site is deleted, its content and files are removed; we keep
        billing records for as long as the law requires for tax and accounting.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You can ask to see, correct or delete your personal data, to object to how we use it, or to get a copy of it. Contact
        us below and we will respond within a reasonable time. You can also complain to the Nigeria Data Protection
        Commission.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use only the cookies and local storage needed to keep you signed in and the service working. We do not use
        advertising cookies.
      </p>

      <h2>8. Changes</h2>
      <p>If we change this policy we will update the date above and tell account owners about material changes.</p>
    </LegalPage>
  );
}
