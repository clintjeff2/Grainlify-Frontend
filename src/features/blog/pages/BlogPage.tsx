import { useState, useEffect } from "react";
import { BlogPost } from "../types";
import { getBlogPosts } from "../../../shared/api/client";
import { BlogHero } from "../components/BlogHero";
import { FeaturedPost } from "../components/FeaturedPost";
import { BlogArticle } from "../components/BlogArticle";
import { RecentPostsGrid } from "../components/RecentPostsGrid";
import { BlogStyles } from "../components/BlogStyles";
import { featuredPost as mockFeaturedPost, recentPosts as mockRecentPosts } from "../data/blogPosts";

export function BlogPage() {
  const useMock = import.meta.env.VITE_USE_MOCK_DATA === "true";
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(!useMock);

  useEffect(() => {
    if (!useMock) {
      setLoading(true);
      getBlogPosts()
        .then((posts) => {
          if (posts && posts.length > 0) {
            setFeaturedPost(posts[0]);
            setRecentPosts(posts.slice(1));
          } else {
            setFeaturedPost(mockFeaturedPost);
            setRecentPosts(mockRecentPosts);
          }
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error("Failed to fetch blog posts, using mock fallback:", err);
          setFeaturedPost(mockFeaturedPost);
          setRecentPosts(mockRecentPosts);
        })
        .finally(() => setLoading(false));
    } else {
      setFeaturedPost(mockFeaturedPost);
      setRecentPosts(mockRecentPosts);
    }
  }, [useMock]);

  if (loading || !featuredPost) {
    return <div className="space-y-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header Hero Section */}
      <BlogHero />

      {/* Featured Article */}
      <FeaturedPost post={featuredPost} />

      {/* Main Content Article - About OnlyGrain */}
      <BlogArticle />

      {/* Recent Posts Grid */}
      <RecentPostsGrid posts={recentPosts} />

      {/* CSS Animations */}
      <BlogStyles />
    </div>
  );
}
