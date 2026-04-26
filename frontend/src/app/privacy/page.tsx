import Link from "next/link";
import { HomeNav } from "@/components/landing/home-nav";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata = {
  title: "Privacy Policy — SparkUpCloud",
  description:
    "Privacy Policy for SparkUpCloud — what data we collect, how we use it, and your rights.",
  alternates: { canonical: "https://www.sparkupcloud.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <HomeNav />

      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-stone-500 mb-8">Last updated: April 2026</p>

        <Section title="1. What We Collect">
          When you create an account, we collect:
          <ul className="mt-2 ml-5 list-disc text-sm text-stone-700">
            <li>Display name and email address</li>
            <li>Hashed password (we never see your plaintext password)</li>
            <li>Study activity: questions answered, time spent, mastery scores</li>
            <li>Payment metadata if you subscribe (handled by Stripe / Gumroad — we never store card numbers)</li>
            <li>Device and browser info via standard server logs</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Data">
          We use your data to:
          <ul className="mt-2 ml-5 list-disc text-sm text-stone-700">
            <li>Personalize your study sessions (adaptive question selection)</li>
            <li>Track your progress and readiness scores</li>
            <li>Send essential service emails (verification, password reset, exam reminders)</li>
            <li>Improve the platform via aggregate analytics</li>
          </ul>
          We do <strong>not</strong> sell or rent your personal data to third parties.
        </Section>

        <Section title="3. Cookies &amp; Local Storage">
          We use:
          <ul className="mt-2 ml-5 list-disc text-sm text-stone-700">
            <li>A session cookie (<code>sparkupcloud_session</code>) to recognize you across pages</li>
            <li>localStorage for your auth token and study state</li>
            <li>No third-party advertising or tracking cookies</li>
          </ul>
        </Section>

        <Section title="4. Third-Party Services">
          We rely on a small number of trusted providers:
          <ul className="mt-2 ml-5 list-disc text-sm text-stone-700">
            <li><strong>Vercel</strong> — frontend hosting</li>
            <li><strong>AWS</strong> — backend hosting (EC2, RDS)</li>
            <li><strong>Stripe / Gumroad</strong> — payment processing</li>
            <li><strong>Anthropic Claude</strong> — AI-generated explanations (only the question content is sent, not your identity)</li>
            <li><strong>Credly &amp; Microsoft Learn</strong> — official badge images embedded by URL</li>
          </ul>
        </Section>

        <Section title="5. Your Rights (GDPR / CCPA)">
          You can:
          <ul className="mt-2 ml-5 list-disc text-sm text-stone-700">
            <li>Access all data we hold about you (email admin@sparkupcloud.com)</li>
            <li>Request deletion of your account and all associated data</li>
            <li>Export your study history in JSON format</li>
            <li>Correct or update your profile from your account page</li>
          </ul>
          We respond to all requests within 30 days.
        </Section>

        <Section title="6. Data Retention">
          Account data is kept while your account is active. After deletion,
          we keep anonymized aggregates only (e.g., &quot;X users took Y mock
          exams this month&quot;) for product improvement. Payment records are
          kept for 7 years for tax compliance.
        </Section>

        <Section title="7. Children's Privacy">
          SparkUpCloud is not intended for users under 16. We do not knowingly
          collect data from children. If you believe a minor has registered,
          contact us at admin@sparkupcloud.com and we&apos;ll delete the account.
        </Section>

        <Section title="8. Security">
          We use HTTPS everywhere, hash passwords with bcrypt, and store
          sensitive backend secrets in encrypted environment variables. No
          system is 100% secure — please use a strong, unique password and
          notify us of any suspected breach.
        </Section>

        <Section title="9. Changes to This Policy">
          Material changes will be announced via email at least 14 days before
          taking effect. Minor clarifications will be reflected in the
          &quot;Last updated&quot; date.
        </Section>

        <Section title="10. Contact">
          Questions about your privacy? Reach us at{" "}
          <a
            href="mailto:admin@sparkupcloud.com"
            className="text-amber-600 hover:text-amber-700"
          >
            admin@sparkupcloud.com
          </a>
          .
        </Section>
      </article>

      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-stone-900 mb-2">{title}</h2>
      <div className="text-sm text-stone-700 leading-relaxed">{children}</div>
    </section>
  );
}
