"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { blogCategories, getBlogPostsByCategory } from "@/lib/blog-data";
import { BlogCard } from "./blog-card";

export function BlogFilters() {
  const [active, setActive] = useState<string>("All");
  const posts = getBlogPostsByCategory(active);

  return (
    <>
      <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
        {blogCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active === cat
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            )}
          >
            {cat} ({cat === "All" ? getBlogPostsByCategory("All").length : getBlogPostsByCategory(cat).length})
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {posts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>
    </>
  );
}
