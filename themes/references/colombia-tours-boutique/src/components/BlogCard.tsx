"use client";
import { motion } from "framer-motion";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  publishedAt: string;
  category: { name: string; slug: string };
}

export function BlogCard({ post, index = 0 }: { post: BlogPost; index?: number }) {
  return (
    <motion.a
      href={`/blog/${post.slug}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="group block rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url('${post.featuredImage}')` }}
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full" style={{ backgroundColor: "var(--nav-link-hover-bg)", color: "var(--accent)" }}>
            {post.category.name}
          </span>
          <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>{post.publishedAt}</span>
        </div>
        <h3 className="font-display text-lg leading-tight mb-2 line-clamp-2 group-hover:text-sand-400 transition-colors" style={{ color: "var(--text-heading)" }}>
          {post.title}
        </h3>
        <p className="font-sans text-sm line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {post.excerpt}
        </p>
      </div>
    </motion.a>
  );
}
