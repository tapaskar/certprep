/**
 * Pricing-page FAQ source of truth.
 *
 * Lives in its own (non-"use client") module so both the interactive
 * FAQSection client component and the server-rendered pricing page (which
 * uses the data to emit a FAQPage JSON-LD schema) can import it cheaply
 * without dragging client boundaries across.
 */
export const pricingFaqs = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes! You can upgrade from Free to Single Exam or Pro at any time. If you're on a Single Exam plan and want to upgrade to Pro, we'll prorate the remaining value. Downgrades take effect at the end of your current billing period.",
  },
  {
    q: "What's included in the free plan?",
    a: "The Free plan gives you access to 50% of the content for one AWS certification exam. This includes practice questions, basic progress tracking, and community access. It's a great way to experience the platform before committing.",
  },
  {
    q: "How long does Single Exam access last?",
    a: "Single Exam access lasts for 6 months from the date of purchase. This gives you plenty of time to study and pass your certification. You get full access to all content, practice questions, mock exams, and AI features for that one exam.",
  },
  {
    q: "What's the refund policy?",
    a: "We offer a pass-or-refund guarantee. If you complete the study plan and don't pass your exam, we'll refund 100% of your payment. No questions asked. Contact support with your exam results and we'll process the refund within 5 business days.",
  },
  {
    q: "Do you offer student or group discounts?",
    a: "Yes! We offer discounts for students with a valid .edu email address. For teams of 3 or more, contact us for custom pricing with volume discounts, admin dashboards, and bulk license management.",
  },
  {
    q: "Can I change my exam after subscribing?",
    a: "On the Pro plan, you have access to all 76+ certifications across AWS, Azure, Google Cloud, CompTIA, and NVIDIA and can switch freely. On the Single Exam plan, you can change your selected exam once within the first 7 days of purchase.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, American Express) through our secure payment provider Stripe. Annual plans can also be paid via bank transfer.",
  },
];
