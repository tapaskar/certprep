import Link from "next/link";

export const metadata = {
  title: "Terms of Service — SparkUpCloud",
  description:
    "Terms of Service for SparkUpCloud — AI-powered certification exam preparation platform.",
  alternates: { canonical: "https://www.sparkupcloud.com/terms" },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-stone-900">
            Spark<span className="text-amber-500">Up</span>Cloud
          </Link>
          <Link href="/" className="text-sm text-stone-500 hover:text-stone-900">
            ← Back to home
          </Link>
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-6 py-12 prose prose-stone">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-stone-500 mb-8">Last updated: April 2026</p>

        <Section title="1. Acceptance of Terms">
          By creating an account or using SparkUpCloud (the &quot;Service&quot;),
          you agree to be bound by these Terms of Service. If you do not agree,
          please do not use the Service.
        </Section>

        <Section title="2. Eligibility">
          You must be at least 16 years old to use this Service. By registering,
          you confirm that you meet this age requirement.
        </Section>

        <Section title="3. Account Responsibilities">
          You are responsible for maintaining the confidentiality of your
          password and for all activities under your account. Notify us
          immediately of any unauthorized use at admin@sparkupcloud.com.
        </Section>

        <Section title="4. Educational Use Only">
          SparkUpCloud is a study aid. Practice questions and explanations are
          designed to help you prepare for certification exams but are not
          official exam content. We do not guarantee passing any specific exam.
        </Section>

        <Section title="5. Subscription &amp; Payments">
          Paid plans are billed in advance and are non-refundable except where
          required by law or under our pass-or-refund guarantee documented on
          the Pricing page. You may cancel anytime; access continues through
          the end of the paid period.
        </Section>

        <Section title="6. Pass-or-Refund Guarantee">
          If you take a paid Pro or Single Exam plan, complete all assigned
          study sessions, take the official exam within the access period, and
          do not pass on the first attempt, we offer a 100% refund. Submit
          proof of attempt to admin@sparkupcloud.com within 30 days of your
          exam date.
        </Section>

        <Section title="7. Acceptable Use">
          You agree not to:
          <ul className="mt-2 ml-5 list-disc text-sm text-stone-700">
            <li>Reverse engineer, scrape, or redistribute the question bank</li>
            <li>Share your account credentials or session tokens</li>
            <li>Use the platform for any unlawful purpose</li>
            <li>Attempt to disrupt the Service&apos;s infrastructure</li>
          </ul>
        </Section>

        <Section title="8. Content Ownership">
          Practice questions, explanations, study materials, and other content
          on SparkUpCloud are the property of SparkUpCloud or its licensors.
          You may use them for personal study only. AWS, Microsoft, Google,
          CompTIA, and NVIDIA certification names and badges are trademarks of
          their respective owners; SparkUpCloud is not affiliated with or
          endorsed by these companies.
        </Section>

        <Section title="9. Disclaimer of Warranties">
          The Service is provided &quot;as is&quot; without warranties of any
          kind. We do not guarantee that practice questions will appear on
          actual certification exams or that using SparkUpCloud will result in
          any particular outcome.
        </Section>

        <Section title="10. Limitation of Liability">
          To the maximum extent permitted by law, SparkUpCloud&apos;s total
          liability for any claim related to the Service shall not exceed the
          amount you paid in the prior 12 months.
        </Section>

        <Section title="11. Changes to Terms">
          We may update these Terms from time to time. Material changes will be
          announced via email or in-app notification at least 14 days before
          taking effect.
        </Section>

        <Section title="12. Contact">
          Questions about these Terms? Reach us at{" "}
          <a
            href="mailto:admin@sparkupcloud.com"
            className="text-amber-600 hover:text-amber-700"
          >
            admin@sparkupcloud.com
          </a>{" "}
          or via{" "}
          <Link href="/contact" className="text-amber-600 hover:text-amber-700">
            our contact form
          </Link>
          .
        </Section>
      </article>
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
