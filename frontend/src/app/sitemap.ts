import { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-data";
import { scenarios } from "@/lib/scenarios-data";

const BASE_URL = "https://www.sparkupcloud.com";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/**
 * Sitemap.
 *
 * Two pieces of dynamic content live here:
 *
 *   1. Every exam at /exams/[examId] — 76+ landing pages. These were
 *      previously absent from the sitemap, so Google had no way to
 *      discover them outside of the /exams hub. They now ship at high
 *      priority (0.85) because they're high-intent commercial pages.
 *
 *   2. Every public Learning Path at /paths/[id]. Today /paths is
 *      auth-gated, but the path detail route renders public metadata
 *      and JSON-LD before the auth gate kicks in, so listing them
 *      lets Google index the title/description.
 *
 * Both lists are fetched at build time. If the API is unreachable
 * during build the sitemap falls back to the static set so we never
 * ship a broken sitemap that would cause Google to deindex pages.
 */
export const revalidate = 3600; // refresh sitemap hourly

interface ApiExam {
  id: string;
  provider: string;
  updated_at?: string;
}

interface ApiPath {
  id: string;
}

async function fetchExams(): Promise<ApiExam[]> {
  try {
    const res = await fetch(`${API_URL}/content/exams`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchPaths(): Promise<ApiPath[]> {
  try {
    const res = await fetch(`${API_URL}/learning-paths`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [exams, paths] = await Promise.all([fetchExams(), fetchPaths()]);

  const blogUrls: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const scenarioUrls: MetadataRoute.Sitemap = scenarios.map((s) => ({
    url: `${BASE_URL}/scenarios/${s.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const examUrls: MetadataRoute.Sitemap = exams.map((e) => ({
    url: `${BASE_URL}/exams/${e.id}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    // Each exam page is a high-intent commercial landing — long-tail
    // queries like "AWS SAA-C03 practice questions" rank here.
    priority: 0.85,
  }));

  const pathUrls: MetadataRoute.Sitemap = paths.map((p) => ({
    url: `${BASE_URL}/paths/${p.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/exams`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },
    ...examUrls,
    {
      url: `${BASE_URL}/paths`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...pathUrls,
    {
      url: `${BASE_URL}/visualizer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/simulator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/scenarios`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...scenarioUrls,
    {
      url: `${BASE_URL}/study/heuristics`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/study/anti-patterns`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/try-questions`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogUrls,
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
