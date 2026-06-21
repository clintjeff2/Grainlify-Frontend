import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import { ThemeProvider } from "../../../shared/contexts/ThemeContext";
import { BlogPostCard } from "./BlogPostCard";
import { BlogPost } from "../types";

const post: BlogPost = {
  id: 1,
  slug: "future-of-decentralized-development",
  title: "The Future of Decentralized Development",
  excerpt: "Exploring how blockchain technology is transforming collaboration.",
  date: "December 20, 2024",
  readTime: "6 min read",
  category: "Innovation",
  icon: "🚀",
};

/**
 * Render the card inside a router whose article route simply echoes the slug,
 * so navigation can be asserted purely from rendered output.
 */
function renderCard(p: BlogPost = post) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/dashboard/blog"]}>
        <Routes>
          <Route path="/dashboard/blog" element={<BlogPostCard post={p} />} />
          <Route
            path="/dashboard/blog/:slug"
            element={<ArticleProbe />}
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** A stand-in article page that surfaces the matched slug for assertions. */
function ArticleProbe() {
  const { slug } = useParams<{ slug: string }>();
  return <div data-testid="article">article:{slug}</div>;
}

describe("BlogPostCard", () => {
  it("renders the post's title, excerpt and metadata", () => {
    renderCard();
    expect(
      screen.getByText("The Future of Decentralized Development"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/blockchain technology is transforming/i),
    ).toBeInTheDocument();
    expect(screen.getByText("December 20, 2024")).toBeInTheDocument();
    expect(screen.getByText("6 min read")).toBeInTheDocument();
    expect(screen.getByText("Innovation")).toBeInTheDocument();
  });

  it("exposes the card as a single accessible link to the article deep link", () => {
    renderCard();
    const link = screen.getByRole("link", {
      name: /read more: the future of decentralized development/i,
    });
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/blog/future-of-decentralized-development",
    );
    // The "Read More" affordance must not be a second interactive control.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("navigates to the article when the card is clicked", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(
      screen.getByRole("link", { name: /read more: the future/i }),
    );

    expect(screen.getByTestId("article")).toHaveTextContent(
      "article:future-of-decentralized-development",
    );
  });

  it("is keyboard-focusable and activates on Enter", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.tab();
    const link = screen.getByRole("link", { name: /read more: the future/i });
    expect(link).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByTestId("article")).toHaveTextContent(
      "article:future-of-decentralized-development",
    );
  });

  it("renders a visible focus ring for keyboard users", () => {
    renderCard();
    const link = screen.getByRole("link", { name: /read more: the future/i });
    expect(link.className).toMatch(/focus-visible:ring-2/);
  });

  it("omits the category chip when the post has no category", () => {
    const withoutCategory: BlogPost = { ...post, category: undefined };
    renderCard(withoutCategory);
    expect(screen.queryByText("Innovation")).not.toBeInTheDocument();
    // Title still links correctly even without a category.
    expect(
      screen.getByRole("link", { name: /read more: the future/i }),
    ).toHaveAttribute("href", "/dashboard/blog/future-of-decentralized-development");
  });

  it("renders correctly under the dark theme", () => {
    localStorage.setItem("theme", "dark");
    try {
      renderCard();
      expect(
        screen.getByText("The Future of Decentralized Development"),
      ).toBeInTheDocument();
    } finally {
      localStorage.clear();
    }
  });
});
