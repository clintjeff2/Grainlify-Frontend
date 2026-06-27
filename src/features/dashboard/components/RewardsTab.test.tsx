import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const mockGetProfileRewards = vi.fn();

vi.mock("../../../shared/api/client", () => ({
  getProfileRewards: () => mockGetProfileRewards(),
}));

vi.mock("../../../shared/contexts/ThemeContext", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useTheme: () => ({
    theme: "light",
    toggleTheme: vi.fn(),
    setThemeFromAnimation: vi.fn(),
  }),
}));

import { RewardsTab } from "./RewardsTab";

// Radix UI components (Popover) require pointer-capture shims under jsdom.
// Pattern copied from DatePicker.test.tsx.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

function renderRewardsTab() {
  return render(<RewardsTab />);
}

beforeEach(() => {
  mockGetProfileRewards.mockReset();
  localStorage.clear();
});

describe("RewardsTab", () => {
  it("fetches rewards and formats real reward data", async () => {
    mockGetProfileRewards.mockResolvedValue({
      rewards: [
        {
          id: "reward-1",
          date: "2026-06-22T00:00:00Z",
          project_name: "Grainlify Frontend",
          project_logo: "GF",
          contributor_login: "maintainer-login",
          contribution_title: "Fix RewardsTab",
          amount: 1250,
          currency: "usd",
          status: "Complete",
        },
      ],
    });

    renderRewardsTab();

    await waitFor(() =>
      expect(screen.getAllByText("Grainlify Frontend").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("$1,250").length).toBeGreaterThan(0);
    expect(screen.getAllByText("maintainer-login").length).toBeGreaterThan(0);
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
    expect(mockGetProfileRewards).toHaveBeenCalledTimes(1);
  });

  it("shows a loading skeleton while rewards are loading", () => {
    mockGetProfileRewards.mockReturnValue(new Promise(() => {}));

    renderRewardsTab();

    expect(screen.getByLabelText("Loading rewards")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("shows an empty state when the API returns no rewards", async () => {
    mockGetProfileRewards.mockResolvedValue({ rewards: [] });

    renderRewardsTab();

    expect(await screen.findByText("No rewards yet")).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it("shows an error state and retries successfully", async () => {
    mockGetProfileRewards.mockRejectedValueOnce(new Error("network"));

    renderRewardsTab();

    const errorMessage = await screen.findByText("Unable to load rewards");
    const retry = errorMessage.closest('[role="alert"]')!.querySelector("button")!;

    mockGetProfileRewards.mockResolvedValue({
      rewards: [
        {
          id: 2,
          created_at: "2026-06-20T00:00:00Z",
          project: "Retry Project",
          amount: "42.5",
          currency: "EUR",
          status: "Processing",
        },
      ],
    });

    await userEvent.click(retry);

    await waitFor(() =>
      expect(screen.getAllByText("Retry Project").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("€42.50").length).toBeGreaterThan(0);
    expect(screen.queryByText("Unable to load rewards")).not.toBeInTheDocument();
    expect(mockGetProfileRewards).toHaveBeenCalledTimes(2);
  });

  it("guards missing amount and currency values without rendering undefined", async () => {
    mockGetProfileRewards.mockResolvedValue({
      rewards: [
        {
          id: "missing-amount",
          project_name: "Guarded Project",
          amount: undefined,
          currency: undefined,
          status: undefined,
        },
      ],
    });

    renderRewardsTab();

    await waitFor(() =>
      expect(screen.getAllByText("Guarded Project").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it("falls back to USD when the API returns an invalid currency code", async () => {
    mockGetProfileRewards.mockResolvedValue({
      rewards: [
        {
          id: "invalid-currency",
          project_name: "Fallback Currency Project",
          amount: 12,
          currency: "not-valid",
          status: "Complete",
        },
      ],
    });

    renderRewardsTab();

    await waitFor(() =>
      expect(
        screen.getAllByText("Fallback Currency Project").length,
      ).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("$12").length).toBeGreaterThan(0);
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  describe("columns popover (Radix UI)", () => {
    it("opens the columns popover when the trigger button is clicked", async () => {
      mockGetProfileRewards.mockResolvedValue({ rewards: [] });
      renderRewardsTab();

      expect(screen.queryByText("Rewards columns")).not.toBeInTheDocument();
      await userEvent.click(
        screen.getByRole("button", { name: /toggle column visibility/i }),
      );
      expect(screen.getByText("Rewards columns")).toBeInTheDocument();
    });

    it("closes the popover when the Complete button is clicked", async () => {
      mockGetProfileRewards.mockResolvedValue({ rewards: [] });
      renderRewardsTab();

      await userEvent.click(
        screen.getByRole("button", { name: /toggle column visibility/i }),
      );
      expect(screen.getByText("Rewards columns")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /complete/i }));
      expect(screen.queryByText("Rewards columns")).not.toBeInTheDocument();
    });

    it("closes the popover when the Pending request button is clicked", async () => {
      mockGetProfileRewards.mockResolvedValue({ rewards: [] });
      renderRewardsTab();

      await userEvent.click(
        screen.getByRole("button", { name: /toggle column visibility/i }),
      );
      expect(screen.getByText("Rewards columns")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /pending request/i }));
      expect(screen.queryByText("Rewards columns")).not.toBeInTheDocument();
    });

    it("column search filters the visible column options inside the popover", async () => {
      mockGetProfileRewards.mockResolvedValue({ rewards: [] });
      renderRewardsTab();

      await userEvent.click(
        screen.getByRole("button", { name: /toggle column visibility/i }),
      );

      // The search input inside the popover has placeholder "Search"
      const searchInputs = screen.getAllByPlaceholderText("Search");
      // The popover search is the last one rendered in the portal
      const popoverSearch = searchInputs[searchInputs.length - 1];

      await userEvent.type(popoverSearch, "am");

      // "Amount" matches, other column names should not be visible as buttons
      expect(screen.getByRole("button", { name: /amount/i })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /^date$/i }),
      ).not.toBeInTheDocument();
    });

    it("toggling a column off and back on saves correct values to localStorage", async () => {
      mockGetProfileRewards.mockResolvedValue({ rewards: [] });
      renderRewardsTab();

      await userEvent.click(
        screen.getByRole("button", { name: /toggle column visibility/i }),
      );

      // Deselect "Status"
      await userEvent.click(screen.getByRole("button", { name: /^status$/i }));
      let stored = JSON.parse(
        localStorage.getItem("rewards_selected_columns") ?? "[]",
      );
      expect(stored).not.toContain("Status");
      expect(stored).toContain("Date");

      // Re-select "Status"
      await userEvent.click(screen.getByRole("button", { name: /^status$/i }));
      stored = JSON.parse(
        localStorage.getItem("rewards_selected_columns") ?? "[]",
      );
      expect(stored).toContain("Status");
    });
  });

  describe("column selection persistence", () => {
    it("persists selected columns to localStorage when a column is deselected", async () => {
      mockGetProfileRewards.mockResolvedValue({ rewards: [] });
      renderRewardsTab();

      await userEvent.click(
        screen.getByRole("button", { name: /toggle column visibility/i }),
      );
      await userEvent.click(screen.getByRole("button", { name: /^date$/i }));

      const stored = JSON.parse(
        localStorage.getItem("rewards_selected_columns") ?? "[]",
      );
      expect(stored).not.toContain("Date");
      expect(stored).toContain("ID");
    });

    it("restores selected columns from localStorage on re-render (simulates page reload)", async () => {
      // Seed localStorage as if a previous session had excluded "Amount"
      localStorage.setItem(
        "rewards_selected_columns",
        JSON.stringify(["Date", "ID", "Project", "Status"]),
      );

      mockGetProfileRewards.mockResolvedValue({
        rewards: [
          {
            id: "r1",
            date: "2026-01-01T00:00:00Z",
            project_name: "TestProject",
            amount: 100,
            currency: "USD",
            status: "Complete",
          },
        ],
      });

      renderRewardsTab();

      await waitFor(() =>
        expect(screen.getAllByText("TestProject").length).toBeGreaterThan(0),
      );

      // "Amount" was excluded — its column header must not appear
      expect(
        screen.queryByRole("columnheader", { name: /^amount$/i }),
      ).not.toBeInTheDocument();
      // "Date" was included — its column header must appear
      expect(
        screen.getByRole("columnheader", { name: /^date$/i }),
      ).toBeInTheDocument();
    });

    it("falls back to all columns when localStorage contains corrupted JSON", () => {
      localStorage.setItem("rewards_selected_columns", "{not valid json");
      mockGetProfileRewards.mockReturnValue(new Promise(() => {}));

      // Should not crash; skeleton is shown
      renderRewardsTab();
      expect(screen.getByLabelText("Loading rewards")).toBeInTheDocument();
    });

    it("falls back to all columns when localStorage contains a non-array value", () => {
      localStorage.setItem(
        "rewards_selected_columns",
        JSON.stringify({ columns: ["Date"] }),
      );
      mockGetProfileRewards.mockReturnValue(new Promise(() => {}));

      renderRewardsTab();
      expect(screen.getByLabelText("Loading rewards")).toBeInTheDocument();
    });

    it("falls back to all columns when all stored names are unknown", () => {
      localStorage.setItem(
        "rewards_selected_columns",
        JSON.stringify(["Injected", "<script>alert(1)</script>", "NotAColumn"]),
      );
      mockGetProfileRewards.mockReturnValue(new Promise(() => {}));

      renderRewardsTab();
      expect(screen.getByLabelText("Loading rewards")).toBeInTheDocument();
    });

    it("strips unknown names from a partially-valid stored array, keeps valid ones", async () => {
      localStorage.setItem(
        "rewards_selected_columns",
        JSON.stringify(["Date", "<script>alert(1)</script>", "Amount"]),
      );

      mockGetProfileRewards.mockResolvedValue({
        rewards: [
          {
            id: "r2",
            project_name: "SafeProject",
            amount: 50,
            currency: "USD",
            status: "Complete",
          },
        ],
      });

      renderRewardsTab();

      await waitFor(() =>
        expect(screen.getAllByText("SafeProject").length).toBeGreaterThan(0),
      );

      // "ID" was not in the stored array — its header must be absent
      expect(
        screen.queryByRole("columnheader", { name: /^id$/i }),
      ).not.toBeInTheDocument();
      // "Date" and "Amount" were valid — their headers must appear
      expect(
        screen.getByRole("columnheader", { name: /^date$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /^amount$/i }),
      ).toBeInTheDocument();
    });
  });

  describe("popover positioning on resize", () => {
    it("keeps the popover visible after a window resize event", async () => {
      mockGetProfileRewards.mockResolvedValue({ rewards: [] });
      renderRewardsTab();

      await userEvent.click(
        screen.getByRole("button", { name: /toggle column visibility/i }),
      );
      expect(screen.getByText("Rewards columns")).toBeInTheDocument();

      window.dispatchEvent(new Event("resize"));

      // Radix handles repositioning internally; the popover must remain open
      expect(screen.getByText("Rewards columns")).toBeInTheDocument();
    });
  });
});
