import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { getPostBySlug } from '../data/blogPosts';
import { sanitizeSlug } from '../utils/slug';

/**
 * Renders a single blog article addressed by its slug
 * (`/dashboard/blog/:slug`).
 *
 * Security: the `:slug` route param is untrusted. We {@link sanitizeSlug | sanitize}
 * it and then resolve it against the known post set via
 * {@link getPostBySlug} — arbitrary route data is never rendered. An invalid
 * or unknown slug falls through to an in-context not-found state rather than a
 * thrown error or a blank page.
 */
export function BlogArticlePage() {
  const { theme } = useTheme();
  const { slug } = useParams<{ slug: string }>();

  const safeSlug = sanitizeSlug(slug);
  const post = safeSlug ? getPostBySlug(safeSlug) : undefined;

  if (!post) {
    return (
      <div className="space-y-6">
        <div
          className={`backdrop-blur-[40px] bg-white/[0.12] rounded-[24px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-10 text-center`}
        >
          <h2
            className={`text-[28px] font-bold mb-3 transition-colors ${
              theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
            }`}
          >
            Article not found
          </h2>
          <p
            className={`text-[16px] mb-6 transition-colors ${
              theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#6b5d4d]'
            }`}
          >
            We couldn't find the article you're looking for. It may have been
            moved or removed.
          </p>
          <Link
            to="/dashboard/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white rounded-[14px] font-semibold text-[14px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/blog"
        className={`inline-flex items-center gap-2 text-[14px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-md ${
          theme === 'dark'
            ? 'text-[#d4d4d4] hover:text-[#f5f5f5]'
            : 'text-[#7a6b5a] hover:text-[#2d2820]'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Blog
      </Link>

      <article className="backdrop-blur-[40px] bg-white/[0.12] rounded-[24px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-10">
        <div className="max-w-4xl mx-auto">
          {/* Article Header */}
          <header className="mb-8">
            {post.category && (
              <span className="inline-block px-3 py-1 mb-4 bg-[#c9983a]/20 border border-[#c9983a]/35 rounded-[8px] text-[11px] font-semibold text-[#8b6f3a]">
                {post.category}
              </span>
            )}
            <h1
              className={`text-[36px] font-bold mb-4 leading-tight transition-colors ${
                theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
              }`}
            >
              {post.title}
            </h1>
            <div
              className={`flex flex-wrap items-center gap-4 text-[14px] transition-colors ${
                theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {post.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </span>
              {post.author && (
                <>
                  <span>•</span>
                  <span>By {post.author}</span>
                </>
              )}
            </div>
          </header>

          {/* Article Body */}
          <div className="prose prose-lg max-w-none">
            <p
              className={`text-[18px] leading-relaxed mb-6 transition-colors ${
                theme === 'dark' ? 'text-[#e5e5e5]' : 'text-[#4a4036]'
              }`}
            >
              {post.excerpt}
            </p>
            {post.content && (
              <p
                className={`text-[16px] leading-relaxed transition-colors whitespace-pre-line ${
                  theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#6b5d4d]'
                }`}
              >
                {post.content}
              </p>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
