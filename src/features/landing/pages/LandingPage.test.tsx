import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingPage } from "./LandingPage";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../../shared/i18n";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../../shared/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

vi.mock("../../../shared/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, logout: vi.fn() }),
}));

vi.mock("../../../shared/hooks/useLandingStats", () => ({
  useLandingStats: () => ({
    display: {
      activeProjects: "1,234",
      contributors: "5,678",
      grantsDistributed: "$2.1M",
    },
  }),
}));

vi.mock("../../../shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
  },
}));

vi.mock("react-theme-switch-animation", () => ({
  useModeAnimation: () => ({
    ref: { current: null },
    toggleSwitchTheme: vi.fn(),
  }),
}));

vi.mock("react-intl", () => ({
  IntlProvider: ({ children }: { children: React.ReactNode }) => children,
  FormattedMessage: ({ id }: { id: string }) => id,
  useIntl: () => ({ locale: "en", formatMessage: ({ id }: { id: string }) => id }),
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <I18nProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LandingPage", () => {
  it("renders without crashing", () => {
    const { container } = renderWithRouter(<LandingPage />);
    expect(container).toBeInTheDocument();
  });

  it("renders the main heading", () => {
    renderWithRouter(<LandingPage />);
    expect(
      screen.getByRole("heading", { name: /connect with open source/i })
    ).toBeInTheDocument();
  });
});

describe("Navbar logo image", () => {
  it("has descriptive alt text", () => {
    renderWithRouter(<LandingPage />);
    const logo = screen.getByAltText("Grainlify");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("alt", "Grainlify");
  });

  it("uses eager loading for above-the-fold LCP image", () => {
    renderWithRouter(<LandingPage />);
    const logo = screen.getByAltText("Grainlify");
    expect(logo).toHaveAttribute("loading", "eager");
  });

  it("has decoding async for performance", () => {
    renderWithRouter(<LandingPage />);
    const logo = screen.getByAltText("Grainlify");
    expect(logo).toHaveAttribute("decoding", "async");
  });
});

describe("Testimonial avatar images", () => {
  it("renders all three testimonial avatars with descriptive alt text", () => {
    renderWithRouter(<LandingPage />);

    const avatars = [
      { name: "Sarah Chen", role: "Full Stack Developer" },
      { name: "Marcus Johnson", role: "Project Maintainer" },
      { name: "Emily Rodriguez", role: "Open Source Contributor" },
    ];

    for (const { name, role } of avatars) {
      const img = screen.getByAltText(`${name}, ${role}`);
      expect(img).toBeInTheDocument();
    }
  });

  it("uses loading=lazy on all testimonial avatars", () => {
    renderWithRouter(<LandingPage />);
    const lazyImages = screen.getAllByTestId("image-with-fallback");
    expect(lazyImages.length).toBeGreaterThanOrEqual(3);

    for (const img of lazyImages) {
      expect(img).toHaveAttribute("loading", "lazy");
    }
  });

  it("uses decoding=async on all testimonial avatars", () => {
    renderWithRouter(<LandingPage />);
    const lazyImages = screen.getAllByTestId("image-with-fallback");

    for (const img of lazyImages) {
      expect(img).toHaveAttribute("decoding", "async");
    }
  });

  it("uses ImageWithFallback for remote avatar images", () => {
    renderWithRouter(<LandingPage />);
    const fallbackImages = screen.getAllByTestId("image-with-fallback");
    expect(fallbackImages.length).toBe(3);
  });
});

describe("ImageWithFallback security", () => {
  it("rejects invalid URLs and renders fallback placeholder", () => {
    // This is tested at the component level in ImageWithFallback.test.tsx;
    // here we verify the integration by checking the data-testid presence.
    renderWithRouter(<LandingPage />);
    const images = screen.getAllByTestId("image-with-fallback");
    expect(images.length).toBe(3);
  });
});