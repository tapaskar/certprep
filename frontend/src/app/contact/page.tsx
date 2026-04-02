import Link from "next/link";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the SparkUpCloud team. We're here to help with your cloud certification journey.",
  alternates: {
    canonical: "https://www.sparkupcloud.com/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-violet-50/30">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-stone-900">
          <img src="/logo.svg" alt="SparkUpCloud" className="h-10 w-auto" />
          SparkUp<span className="text-amber-500">Cloud</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-stone-500 hover:text-stone-700"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="hidden sm:inline-flex h-9 items-center rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center px-6 pt-12 pb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
          Get in{" "}
          <span className="relative inline-block">
            Touch
            <span className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-amber-500" />
          </span>
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-stone-600">
          Have a question, feedback, or need help? We&apos;d love to hear from you.
        </p>
      </section>

      {/* Contact Form */}
      <section className="mx-auto max-w-xl px-6 pb-20">
        <ContactForm />
      </section>

      {/* Info Cards */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
            <p className="text-sm font-bold text-stone-900">Email</p>
            <p className="mt-1 text-sm text-stone-500">admin@sparkupcloud.com</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
            <p className="text-sm font-bold text-stone-900">Response Time</p>
            <p className="mt-1 text-sm text-stone-500">Within 24 hours</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
            <p className="text-sm font-bold text-stone-900">Support</p>
            <p className="mt-1 text-sm text-stone-500">Mon-Fri, 9am-6pm EST</p>
          </div>
        </div>
      </section>

      {/* Trust tagline */}
      <section className="pb-16 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
          Trusted by professionals preparing for cloud certifications worldwide
        </p>
      </section>
    </div>
  );
}
