import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const mockGetProfileContributions = vi.fn();

vi.mock("../../../shared/api/client", () => ({
  getProfileContributions: () => mockGetProfileContributions(),
}));

vi.mock("../../../shared/contexts/ThemeContext", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useTheme: () => ({
    theme: "light",
    toggleTheme: vi.fn(),
    setThemeFromAnimation: vi.fn(),
  }),
}));

import { ContributionsTab } from "./ContributionsTab";

function renderContributionsTab() {
  return render(<ContributionsTab />);
}

beforeEach(() => {
  mockGetProfileContributions.mockReset();
});

describe("ContributionsTab", () => {
  it("fetches contribution items and groups them by status columns", async () => {
    mockGetProfileContributions.mockResolvedValue({
      contributions: [
        {
          id: "applied-1",
          title: "Apply live board data",
          status: "applied",
          project_name: "Grainlify Frontend",
          badge: "165",
          updated_at: "2026-06-22T00:00:00Z",
          tag: "frontend",
          url: "https://github.com/Grainlify/Grainlify-Frontend/issues/165",
        },
        {
          id: "assigned-1",
          title: "Assigned contribution work",
          status: "assigned",
          project_name: "StableRoute",
          badge: "68",
          updated_at: "2026-06-23T00:00:00Z",
          tag: "enhancement",
        },
        {
          id: "pending-1",
          title: "Pending review contribution",
          status: "pending_review",
          project_name: "Agentpay",
          badge: "88",
          updated_at: "2026-06-24T00:00:00Z",
          tag: "testing",
        },
        {
          id: "complete-1",
          title: "Completed contribution",
          status: "completed",
          project_name: "Docusaurus Glean",
          updated_at: "2026-06-20T00:00:00Z",
          tag: "bug",
        },
      ],
    });

    renderContributionsTab();

    await waitFor(() =>
      expect(screen.getAllByText("Apply live board data").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("Assigned contribution work").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending review contribution").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Completed contribution").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /see application/i })).toHaveAttribute(
      "href",
      "https://github.com/Grainlify/Grainlify-Frontend/issues/165",
    );
    expect(screen.queryByText("Add dark mode support to the dashboard")).not.toBeInTheDocument();
    expect(mockGetProfileContributions).toHaveBeenCalledTimes(1);
  });

  it("shows loading skeletons while contribution items are loading", () => {
    mockGetProfileContributions.mockReturnValue(new Promise(() => {}));

    renderContributionsTab();

    expect(screen.getByLabelText("Loading contributions")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("shows an empty state for each column that has no matching contributions", async () => {
    mockGetProfileContributions.mockResolvedValue({
      contributions: [
        {
          id: "applied-only",
          title: "Only applied item",
          status: "applied",
          project_name: "Grainlify Frontend",
        },
      ],
    });

    renderContributionsTab();

    expect(await screen.findByText("Only applied item")).toBeInTheDocument();
    expect(screen.getAllByText("No assigned contributions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No pending review contributions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No complete contributions").length).toBeGreaterThan(0);
  });

  it("shows an error state and retries the failed request", async () => {
    mockGetProfileContributions.mockRejectedValueOnce(new Error("network"));

    renderContributionsTab();

    const errorMessage = await screen.findByText("Unable to load contributions");
    const retry = errorMessage.closest('[role="alert"]')!.querySelector("button")!;

    mockGetProfileContributions.mockResolvedValue({
      contributions: [
        {
          id: "retry-1",
          title: "Recovered contribution",
          status: "assigned",
          project_name: "Retry Project",
        },
      ],
    });

    await userEvent.click(retry);

    await waitFor(() =>
      expect(screen.getAllByText("Recovered contribution").length).toBeGreaterThan(0),
    );
    expect(screen.queryByText("Unable to load contributions")).not.toBeInTheDocument();
    expect(mockGetProfileContributions).toHaveBeenCalledTimes(2);
  });

  it("filters visible contribution cards by selected project", async () => {
    mockGetProfileContributions.mockResolvedValue({
      contributions: [
        {
          id: "grainlify-1",
          title: "Grainlify-only contribution",
          status: "assigned",
          project_name: "Grainlify Frontend",
        },
        {
          id: "agentpay-1",
          title: "Agentpay contribution",
          status: "assigned",
          project_name: "Agentpay",
        },
      ],
    });

    renderContributionsTab();

    await waitFor(() =>
      expect(screen.getAllByText("Grainlify-only contribution").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("Agentpay contribution").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: /filter contributions/i }));
    await userEvent.click(screen.getByRole("button", { name: "Grainlify Frontend" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getAllByText("Grainlify-only contribution").length).toBeGreaterThan(0);
    expect(screen.queryByText("Agentpay contribution")).not.toBeInTheDocument();
  });

  it("filters contributions by search text", async () => {
    mockGetProfileContributions.mockResolvedValue({
      contributions: [
        {
          id: "search-1",
          title: "Search-visible contribution",
          status: "assigned",
          project_name: "Search Project",
        },
        {
          id: "search-2",
          title: "Hidden by search",
          status: "assigned",
          project_name: "Other Project",
        },
      ],
    });

    renderContributionsTab();

    await screen.findByText("Search-visible contribution");
    await userEvent.type(screen.getByPlaceholderText("Search"), "visible");

    expect(screen.getByText("Search-visible contribution")).toBeInTheDocument();
    expect(screen.queryByText("Hidden by search")).not.toBeInTheDocument();
  });

  it("supports project search, project reset, and restored board items", async () => {
    mockGetProfileContributions.mockResolvedValue({
      contributions: [
        {
          id: "reset-1",
          title: "Reset Grainlify contribution",
          status: "assigned",
          project_name: "Grainlify Frontend",
        },
        {
          id: "reset-2",
          title: "Reset Agentpay contribution",
          status: "assigned",
          project_name: "Agentpay",
        },
      ],
    });

    renderContributionsTab();

    await screen.findByText("Reset Grainlify contribution");
    await userEvent.click(screen.getByRole("button", { name: /filter contributions/i }));
    await userEvent.type(screen.getByPlaceholderText("Search projects"), "missing");
    expect(screen.getByText("No items found")).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText("Search projects"));
    await userEvent.click(screen.getByRole("button", { name: "Grainlify Frontend" }));
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Reset Grainlify contribution")).toBeInTheDocument();
    expect(screen.getByText("Reset Agentpay contribution")).toBeInTheDocument();
  });

  it("filters by rewarded status", async () => {
    mockGetProfileContributions.mockResolvedValue({
      contributions: [
        {
          id: "rewarded-1",
          title: "Rewarded contribution",
          status: "complete",
          project_name: "Paid Project",
          reward_status: "paid",
        },
        {
          id: "unrewarded-1",
          title: "Unrewarded contribution",
          status: "complete",
          project_name: "Open Project",
        },
      ],
    });

    renderContributionsTab();

    await screen.findByText("Rewarded contribution");
    expect(screen.getByText("Unrewarded contribution")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /filter contributions/i }));
    await userEvent.click(screen.getByRole("button", { name: "Unrewarded" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Rewarded contribution")).toBeInTheDocument();
    expect(screen.queryByText("Unrewarded contribution")).not.toBeInTheDocument();
  });

  it("closes and toggles filter panel sections without losing selections", async () => {
    mockGetProfileContributions.mockResolvedValue({
      contributions: [
        {
          id: "panel-1",
          title: "Panel interaction contribution",
          status: "assigned",
          project_name: "Panel Project",
        },
      ],
    });

    renderContributionsTab();

    await screen.findByText("Panel interaction contribution");
    await userEvent.click(screen.getByRole("button", { name: /filter contributions/i }));
    expect(screen.getByRole("heading", { name: "Filter contributions" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /close filter/i }));
    expect(
      screen.queryByRole("heading", { name: "Filter contributions" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /filter contributions/i }));
    await userEvent.click(screen.getByRole("button", { name: /projects/i }));
    expect(screen.queryByPlaceholderText("Search projects")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /rewarded 2/i }));
    expect(screen.queryByText("Rewarded, Unrewarded")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /rewarded 2/i }));
    await userEvent.click(screen.getByRole("button", { name: "Rewarded" }));
    await userEvent.click(screen.getByRole("button", { name: "Unrewarded" }));
    expect(screen.getByText("No reward filters selected")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Rewarded" }));
    expect(screen.queryByText("No reward filters selected")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rewarded 1/i })).toBeInTheDocument();
  });

  it("renders repository-supplied titles as escaped text", async () => {
    mockGetProfileContributions.mockResolvedValue({
      contributions: [
        {
          id: "unsafe-title",
          title: "<img src=x onerror=alert(1)>",
          status: "complete",
          project_name: "Security Project",
        },
      ],
    });

    renderContributionsTab();

    expect(await screen.findByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });
});
