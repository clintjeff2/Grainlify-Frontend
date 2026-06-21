import { BlogPost } from '../types';

export const featuredPost: BlogPost = {
  id: 0,
  slug: "bridging-the-gap-onlygrain-open-source",
  title: "Bridging the Gap: How OnlyGrain is Revolutionizing Open Source Contribution",
  excerpt: "Discover how OnlyGrain connects talented developers with groundbreaking Web3 projects across all blockchain ecosystems, creating a seamless bridge between innovation and execution.",
  content:
    "OnlyGrain connects talented open-source developers with innovative Web3 " +
    "projects across every major blockchain ecosystem. By matching contributors " +
    "to work that fits their skills and rewarding quality contributions " +
    "transparently, we make meaningful collaboration accessible to everyone — " +
    "from seasoned protocol engineers to first-time Web3 contributors.",
  date: "December 27, 2024",
  readTime: "8 min read",
  author: "OnlyGrain Team",
  image: "🌐",
  isFeatured: true,
};

export const recentPosts: BlogPost[] = [
  {
    id: 1,
    slug: "future-of-decentralized-development",
    title: "The Future of Decentralized Development",
    excerpt: "Exploring how blockchain technology is transforming the way developers collaborate on open-source projects.",
    date: "December 20, 2024",
    readTime: "6 min read",
    category: "Innovation",
    icon: "🚀"
  },
  {
    id: 2,
    slug: "cross-chain-collaboration",
    title: "Cross-Chain Collaboration: Breaking Down Barriers",
    excerpt: "How OnlyGrain enables developers to contribute to projects across multiple blockchain ecosystems seamlessly.",
    date: "December 15, 2024",
    readTime: "7 min read",
    category: "Technology",
    icon: "🔗"
  },
  {
    id: 3,
    slug: "incentivizing-quality-contributions",
    title: "Incentivizing Quality Contributions",
    excerpt: "Learn about our reward system that recognizes and compensates exceptional open-source contributions.",
    date: "December 10, 2024",
    readTime: "5 min read",
    category: "Community",
    icon: "💎"
  }
];

// Easy to add more blog posts here in the future
export const allBlogPosts: BlogPost[] = [
  featuredPost,
  ...recentPosts,
];

/**
 * Resolves a post from the *known* post set by its slug.
 *
 * Security: the caller is expected to pass a value that originates from the
 * URL (untrusted input). Rather than rendering arbitrary route data, we only
 * ever return a post that exists in {@link allBlogPosts}; an unknown or
 * malformed slug yields `undefined` so the route can show a not-found state.
 *
 * @param slug - A sanitized, URL-safe slug (see `sanitizeSlug`).
 * @returns The matching post, or `undefined` when no post owns that slug.
 */
export function getPostBySlug(slug: string): BlogPost | undefined {
  return allBlogPosts.find((post) => post.slug === slug);
}
