import Link from "next/link";
import { Clock } from "lucide-react";
import type { BlogPost } from "@/lib/blog-data";

const categoryColors: Record<string, string> = {
  AWS: "bg-amber-100 text-amber-700",
  Azure: "bg-blue-100 text-blue-700",
  "Google Cloud": "bg-green-100 text-green-700",
  "Study Tips": "bg-violet-100 text-violet-700",
  Career: "bg-rose-100 text-rose-700",
};

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]"
    >
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${categoryColors[post.category] || "bg-stone-100 text-stone-600"}`}
        >
          {post.category}
        </span>
        <span className="text-xs text-stone-400">{post.date}</span>
      </div>
      <h3 className="mt-3 text-lg font-bold text-stone-900 group-hover:text-amber-600 transition-colors">
        {post.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-500 line-clamp-2">
        {post.description}
      </p>
      <div className="mt-4 flex items-center gap-1 text-xs text-stone-400">
        <Clock className="h-3.5 w-3.5" />
        {post.readTime}
      </div>
    </Link>
  );
}
