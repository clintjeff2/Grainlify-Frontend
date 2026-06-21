import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "../../../shared/contexts/ThemeContext";
import { BlogArticlePage } from "./BlogArticlePage";
import { allBlogPosts } from "../data/blogPosts";

/** Render the article page at a given `/dashboard/blog/:slug` entry. */
function renderAt(slug: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[`/dashboard/blog/${slug}`]}>
        <Routes>
          <Route path="/dashboard/blog" element={<div>blog index</div>} />
          <Route path="/dashboard/blog/:slug" element={<BlogArticlePage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("BlogArticlePage", () => {
  it("renders the matched post for a valid slug", () => {
    const post = allBlogPosts[1];
    renderAt(post.slug);

    expect(
      screen.getByRole("heading", { level: 1, name: post.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(post.excerpt)).toBeInTheDocument();
    expect(screen.getByText(post.date)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to blog/i }),
    ).toHaveAttribute("href", "/dashboard/blog");
  });

  it("shows a not-found state for an unknown slug", () => {
    renderAt("this-post-does-not-exist");

    expect(screen.getByText(/article not found/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 1, name: /onlygrain/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to blog/i }),
    ).toBeInTheDocument();
  });

  it("rejects a malformed/hostile slug instead of looking it up", () => {
    // Path-traversal / markup style input must never resolve to a post.
    renderAt(encodeURIComponent("../<script>alert(1)</script>"));

    expect(screen.getByText(/article not found/i)).toBeInTheDocument();
  });

  it("renders author and full content when the post provides them", () => {
    // The featured post carries an `author` and long-form `content`.
    const featured = allBlogPosts.find((p) => p.isFeatured)!;
    renderAt(featured.slug);

    expect(screen.getByText(`By ${featured.author}`)).toBeInTheDocument();
    expect(screen.getByText(featured.content!)).toBeInTheDocument();
  });

  it("renders the article and not-found states under the dark theme", () => {
    localStorage.setItem("theme", "dark");
    try {
      const { unmount } = renderAt(allBlogPosts[1].slug);
      expect(
        screen.getByRole("heading", { level: 1, name: allBlogPosts[1].title }),
      ).toBeInTheDocument();
      unmount();

      renderAt("nope-not-real");
      expect(screen.getByText(/article not found/i)).toBeInTheDocument();
    } finally {
      localStorage.clear();
    }
  });
});
