import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../../../shared/contexts/ThemeContext";
import { I18nProvider } from "../../../shared/i18n";
import { BlogPage } from "./BlogPage";

vi.mock("../../../shared/api/client", () => ({
  getBlogPosts: vi.fn(),
}));

import { getBlogPosts } from "../../../shared/api/client";
const mockGetBlogPosts = vi.mocked(getBlogPosts);

function renderBlogPage() {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <MemoryRouter>
          <BlogPage />
        </MemoryRouter>
      </ThemeProvider>
    </I18nProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  // Ensure mock mode is off so we hit the real fetch path.
  vi.stubEnv("VITE_USE_MOCK_DATA", "false");
});

describe("BlogPage – loading state", () => {
  it("shows a loading skeleton while fetching", () => {
    // Never resolve so the component stays in loading state.
    mockGetBlogPosts.mockReturnValue(new Promise(() => {}));
    renderBlogPage();

    const container = screen.getByLabelText(/loading blog posts/i);
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("aria-busy", "true");
  });

  it("does not render article content while loading", () => {
    mockGetBlogPosts.mockReturnValue(new Promise(() => {}));
    renderBlogPage();

    expect(screen.queryByText(/recent articles/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/featured/i)).not.toBeInTheDocument();
  });
});

describe("BlogPage – error state", () => {
  it("shows a generic error message on fetch failure", async () => {
    mockGetBlogPosts.mockRejectedValue(new Error("network error"));
    renderBlogPage();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(screen.getByText(/unable to load blog posts/i)).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("does not reveal internal error details in the UI", async () => {
    mockGetBlogPosts.mockRejectedValue(new Error("Internal server error 500"));
    renderBlogPage();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/internal server error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/500/i)).not.toBeInTheDocument();
  });

  it("retries the fetch when the Retry button is clicked", async () => {
    const user = userEvent.setup();
    mockGetBlogPosts
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce([
        {
          id: 1,
          slug: "first-post",
          title: "First Post",
          excerpt: "An excerpt.",
          date: "June 2026",
          readTime: "3 min read",
        },
      ]);

    renderBlogPage();

    const retryBtn = await screen.findByRole("button", { name: /retry/i });
    await user.click(retryBtn);

    await waitFor(() =>
      expect(screen.getByText("First Post")).toBeInTheDocument(),
    );
    expect(mockGetBlogPosts).toHaveBeenCalledTimes(2);
  });
});

describe("BlogPage – empty state", () => {
  it("shows an empty state when the API returns zero posts", async () => {
    mockGetBlogPosts.mockResolvedValue([]);
    renderBlogPage();

    await waitFor(() =>
      expect(screen.getByText(/no blog posts yet/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/recent articles/i)).not.toBeInTheDocument();
  });
});

describe("BlogPage – ok state", () => {
  const posts = [
    {
      id: 1,
      slug: "featured-post",
      title: "Featured Post Title",
      excerpt: "Featured excerpt.",
      date: "June 2026",
      readTime: "5 min read",
      author: "Alice",
      image: "🌐",
      isFeatured: true,
    },
    {
      id: 2,
      slug: "recent-post",
      title: "Recent Post Title",
      excerpt: "Recent excerpt.",
      date: "May 2026",
      readTime: "3 min read",
      category: "Tech",
      icon: "🚀",
    },
  ];

  it("renders the featured post and recent posts grid", async () => {
    mockGetBlogPosts.mockResolvedValue(posts);
    renderBlogPage();

    await waitFor(() =>
      expect(screen.getByText("Featured Post Title")).toBeInTheDocument(),
    );
    expect(screen.getByText("Recent Articles")).toBeInTheDocument();
    expect(screen.getByText("Recent Post Title")).toBeInTheDocument();
  });
});

describe("FeaturedPost – missing post fallback", () => {
  it("shows a fallback when the API returns only one post (no recent posts)", async () => {
    mockGetBlogPosts.mockResolvedValue([
      {
        id: 1,
        slug: "only-post",
        title: "Only Post",
        excerpt: "Excerpt.",
        date: "June 2026",
        readTime: "2 min read",
      },
    ]);
    renderBlogPage();

    await waitFor(() =>
      expect(screen.getByText("Only Post")).toBeInTheDocument(),
    );
    // No recent posts – empty state inside the grid.
    expect(
      screen.getByText(/no recent articles available/i),
    ).toBeInTheDocument();
  });
});

describe("FeaturedPost component – null post", () => {
  it("renders a fallback UI when post is null", async () => {
    // Force the page into a state where featured is null by having the API
    // return an empty array; the empty state covers this path at page level.
    // Test the component directly here.
    const { FeaturedPost } = await import("../components/FeaturedPost");
    const { render: rdr, screen: scr } = await import("@testing-library/react");
    rdr(
      <ThemeProvider>
        <FeaturedPost post={null} />
      </ThemeProvider>,
    );
    expect(scr.getByLabelText(/no featured post available/i)).toBeInTheDocument();
  });
});
