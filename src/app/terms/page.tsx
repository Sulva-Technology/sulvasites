import type { Metadata } from "next";
import Link from "next/link";

import LegalPage from "@/components/marketing/LegalPage";
import { TRIAL_DAYS } from "@/lib/marketing/pricing";

export const metadata: Metadata = {
  title: "Terms and refund policy — Sulva Sites",
  description: "The terms for using Sulva Sites, including billing, cancellation and our refund policy.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service and refund policy">
      <p>
        Sulva Sites is a website builder run by Sulvatech (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or
        paying for a site you agree to these terms.
      </p>

      <h2>1. Your account and site</h2>
      <ul>
        <li>You must give accurate details and keep your password safe. You are responsible for activity on your account.</li>
        <li>You own the content you put on your site (text, photos, logos, products). You give us permission to store and display it so we can run your site.</li>
        <li>Your site must not contain anything unlawful, misleading, infringing or harmful, and you must have the right to use every photo and text you upload.</li>
        <li>We may pause or remove a site that breaks these rules, after telling you where we reasonably can.</li>
      </ul>

      <h2>2. Free trial</h2>
      <p>
        New sites get a {TRIAL_DAYS}-day free trial with no card needed. When the trial ends the site pauses until you pick a
        plan. Nothing is deleted, and paying brings it back. Unused trial days are added before your first paid month starts.
      </p>

      <h2>3. Plans, prices and payment</h2>
      <ul>
        <li>Plans and prices are shown on our <Link className="underline" href="/pricing">pricing page</Link> in naira. Launch pricing, where offered, is kept for as long as your subscription stays active.</li>
        <li>Payments are processed by Paystack. We do not store your card details.</li>
        <li>Plans renew automatically each period until you cancel. If a renewal fails, we will tell you and may pause the site until payment succeeds.</li>
        <li>Optional extras (such as a domain we buy and manage for you, or a done-for-you build) are priced separately and shown before you pay.</li>
      </ul>

      <h2>4. Cancelling</h2>
      <p>
        You can cancel at any time from your dashboard. Your site stays live until the end of the period you have already paid
        for, then it pauses. We do not charge you again after you cancel.
      </p>

      <h2 id="refunds">5. Refund policy</h2>
      <ul>
        <li><b>Free trial:</b> costs nothing, so there is nothing to refund.</li>
        <li><b>Subscription fees:</b> are for the period they cover. When you cancel, you keep access until that period ends and we do not refund the unused part of it.</li>
        <li><b>Mistakes and double charges:</b> if we charge you in error, charge you twice, or you are billed after a cancellation, we refund the amount in full.</li>
        <li><b>Service problems:</b> if we cannot deliver what you paid for (for example your site is unavailable for a long period because of a fault on our side), contact us and we will fix it, extend your period or refund the affected time.</li>
        <li><b>Done-for-you builds and domain purchases:</b> once work has started or a domain has been registered in your name, those costs cannot be refunded, as they are paid out to third parties or already delivered.</li>
      </ul>
      <p>
        To ask for a refund, contact us within 14 days of the charge with your site name and the payment reference. Approved
        refunds go back to the original payment method through Paystack and can take several business days to show.
      </p>

      <h2>6. Availability</h2>
      <p>
        We work to keep sites online, but we do not promise uninterrupted service. Scheduled maintenance, outages of our
        providers and events beyond our control can cause downtime.
      </p>

      <h2>7. Our liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect losses such as lost sales or profit, and our total
        liability to you for any claim is limited to the fees you paid us in the three months before it arose. Nothing here
        limits liability that cannot be limited by law.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these terms. We will change the date above and, for material changes, tell account owners by email
        before they take effect. Continuing to use Sulva Sites afterwards means you accept the new terms.
      </p>

      <h2>9. Governing law</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
    </LegalPage>
  );
}
