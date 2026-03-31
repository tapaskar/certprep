"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.sendContactMessage({ name, email, subject, message });
      setSent(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-10 text-center shadow-md shadow-stone-200/60">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h3 className="text-xl font-bold text-stone-900">Message Sent!</h3>
        <p className="mt-2 text-sm text-stone-500">
          Thank you for reaching out. We&apos;ll get back to you within 24 hours.
        </p>
        <button
          onClick={() => {
            setSent(false);
            setName("");
            setEmail("");
            setSubject("");
            setMessage("");
          }}
          className="mt-6 text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-stone-200 bg-white p-8 shadow-md shadow-stone-200/60 space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-stone-300 p-3 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Your name"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 p-3 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="subject"
          className="mb-1 block text-sm font-medium text-stone-700"
        >
          Subject
        </label>
        <input
          id="subject"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-lg border border-stone-300 p-3 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="How can we help?"
        />
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-1 block text-sm font-medium text-stone-700"
        >
          Message
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-none rounded-lg border border-stone-300 p-3 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="Tell us more..."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-3 font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          "Sending..."
        ) : (
          <>
            Send Message
            <Send className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
