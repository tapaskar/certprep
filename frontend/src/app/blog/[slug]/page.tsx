import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { blogPosts, getBlogPost } from "@/lib/blog-data";
import { HomeNav } from "@/components/landing/home-nav";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `https://www.sparkupcloud.com/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

const categoryColors: Record<string, string> = {
  AWS: "bg-amber-100 text-amber-700",
  Azure: "bg-blue-100 text-blue-700",
  "Google Cloud": "bg-green-100 text-green-700",
  "Study Tips": "bg-violet-100 text-violet-700",
  Career: "bg-rose-100 text-rose-700",
};

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    publisher: {
      "@type": "Organization",
      name: "SparkUpCloud",
      url: "https://www.sparkupcloud.com",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.sparkupcloud.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://www.sparkupcloud.com/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://www.sparkupcloud.com/blog/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-violet-50/30">
        <HomeNav />

        {/* Article */}
        <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${categoryColors[post.category] || "bg-stone-100 text-stone-600"}`}
            >
              {post.category}
            </span>
            <span className="text-sm text-stone-400">{post.date}</span>
            <span className="flex items-center gap-1 text-sm text-stone-400">
              <Clock className="h-3.5 w-3.5" />
              {post.readTime}
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-stone-600">
            {post.description}
          </p>

          <div className="mt-12 space-y-10">
            {post.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-xl font-bold text-stone-900">
                  {section.heading}
                </h2>
                <p className="mt-3 text-base leading-7 text-stone-600">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 p-8 text-center shadow-lg">
            <h3 className="text-xl font-bold text-white">
              Ready to start practicing?
            </h3>
            <p className="mt-2 text-sm text-amber-100">
              Join SparkUpCloud for AI-powered exam preparation with adaptive
              learning and spaced repetition.
            </p>
            <Link
              href="/register"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-white px-6 text-sm font-bold text-amber-600 shadow-md hover:scale-105 transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </article>

        {/* Footer */}
        <footer className="border-t border-stone-200 bg-white/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
            <div className="flex items-center gap-2">
              <img
                src="/logo.svg"
                alt="SparkUpCloud"
                className="h-6 w-auto"
              />
              <span className="text-sm font-semibold text-stone-700">
                Spark<span className="text-amber-500">Up</span>Cloud
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link
                href="/blog"
                className="text-stone-500 transition-colors hover:text-amber-600"
              >
                Blog
              </Link>
              <Link
                href="/pricing"
                className="text-stone-500 transition-colors hover:text-amber-600"
              >
                Pricing
              </Link>
              <Link
                href="/contact"
                className="text-stone-500 transition-colors hover:text-amber-600"
              >
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
