/**
 * JSON-LD structured-data emitter.
 *
 * Renders a single <script type="application/ld+json"> tag with the supplied
 * payload. Use one component per schema entity. Co-locate with the page that
 * "owns" the entity (Organization on the root layout, Course on each exam
 * page, FAQPage where the FAQ lives, etc).
 *
 * Why a separate component instead of `dangerouslySetInnerHTML` inline:
 * keeps payload typing centralized, makes it easy to grep for "<JsonLd"
 * across the codebase, and lets us swap to `next/script type="application/ld+json"`
 * later if Google's tooling changes preference.
 */
type JsonLdPayload = Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLdPayload | JsonLdPayload[] }) {
  return (
    <script
      type="application/ld+json"
      // Stringify rather than render — Google requires raw JSON, not JSX.
      // The payload is built from trusted constants/page metadata, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Reusable schema builders
// ---------------------------------------------------------------------------

const SITE_URL = "https://www.sparkupcloud.com";
const SITE_LOGO = `${SITE_URL}/logo.png`;

export function organizationSchema(): JsonLdPayload {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SparkUpCloud",
    url: SITE_URL,
    logo: SITE_LOGO,
    description:
      "AI-powered exam preparation for 76+ AWS, Azure, Google Cloud, CompTIA, NVIDIA, and Red Hat certifications.",
    foundingDate: "2024",
    sameAs: [
      "https://twitter.com/sparkupcloud",
      "https://www.linkedin.com/company/sparkupcloud",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@sparkupcloud.com",
      availableLanguage: ["English"],
    },
  };
}

export function websiteSchema(): JsonLdPayload {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SparkUpCloud",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/exams?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function courseSchema(input: {
  name: string;
  description: string;
  url: string;
  provider?: string;
  certCode?: string;
}): JsonLdPayload {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: input.name,
    description: input.description,
    url: input.url,
    provider: {
      "@type": "Organization",
      name: "SparkUpCloud",
      sameAs: SITE_URL,
    },
    educationalCredentialAwarded:
      input.certCode ?? "Certification Exam Preparation",
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      category: "Educational",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/register`,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: "PT40H",
    },
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqSchema(items: FaqItem[]): JsonLdPayload {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
