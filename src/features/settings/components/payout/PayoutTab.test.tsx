// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PayoutTab } from './PayoutTab';
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext';
import { BillingProfilesProvider } from '../../contexts/BillingProfilesContext';

// ── Hoisted mock factories ────────────────────────────────────────────────────
const {
  mockGetProjectsContributed,
  mockGetPayoutMappings,
  mockSavePayoutMappings,
} = vi.hoisted(() => ({
  mockGetProjectsContributed: vi.fn(),
  mockGetPayoutMappings: vi.fn(),
  mockSavePayoutMappings: vi.fn(),
}));

vi.mock('../../../../shared/api/client', () => ({
  getProjectsContributed: mockGetProjectsContributed,
  getPayoutMappings: mockGetPayoutMappings,
  savePayoutMappings: mockSavePayoutMappings,
}));

// Capture toast calls without rendering the Toaster DOM node
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
  Toaster: () => null,
}));

// ── Test fixtures ─────────────────────────────────────────────────────────────
const PROJECT_A = {
  id: 'proj-1',
  github_full_name: 'org/alpha',
  status: 'active',
  ecosystem_name: 'Stellar',
  language: undefined,
  owner_avatar_url: undefined,
};

const PROJECT_B = {
  id: 'proj-2',
  github_full_name: 'org/beta',
  status: 'active',
  ecosystem_name: undefined,
  language: 'TypeScript',
  owner_avatar_url: undefined,
};

const VERIFIED_PROFILE = { id: 1, name: 'My Wallet', status: 'verified' as const, type: 'individual' as const };
const UNVERIFIED_PROFILE = { id: 2, name: 'Pending', status: 'missing-verification' as const, type: 'individual' as const };

// ── Render helper ─────────────────────────────────────────────────────────────
function renderPayoutTab(
  initialProfiles: typeof VERIFIED_PROFILE[] = [],
) {
  // Seed localStorage so BillingProfilesProvider picks up these profiles
  localStorage.setItem('billing_profiles', JSON.stringify(initialProfiles));

  return render(
    <ThemeProvider>
      <BillingProfilesProvider>
        <PayoutTab />
      </BillingProfilesProvider>
    </ThemeProvider>,
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  // Default: no persisted mappings, no projects
  mockGetProjectsContributed.mockResolvedValue([]);
  mockGetPayoutMappings.mockResolvedValue([]);
  mockSavePayoutMappings.mockResolvedValue({ ok: true });
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('PayoutTab – loading state', () => {
  it('shows skeleton loaders while data is fetching', () => {
    // Never resolve so we stay in loading state
    mockGetProjectsContributed.mockReturnValue(new Promise(() => {}));
    mockGetPayoutMappings.mockReturnValue(new Promise(() => {}));

    renderPayoutTab();

    // SkeletonLoader elements are rendered (they have an animated class)
    const skeletons = document.querySelectorAll('[class*="animate"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('PayoutTab – empty state', () => {
  it('renders the empty-state message when no projects are returned', async () => {
    mockGetProjectsContributed.mockResolvedValue([]);

    renderPayoutTab();

    await waitFor(() =>
      expect(screen.getByText('No projects found')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });
});

describe('PayoutTab – error state', () => {
  it('shows an error banner when the projects fetch fails', async () => {
    mockGetProjectsContributed.mockRejectedValue(new Error('Network error'));

    renderPayoutTab();

    await waitFor(() =>
      expect(
        screen.getByText(/failed to load projects/i),
      ).toBeInTheDocument(),
    );
  });
});

describe('PayoutTab – projects list', () => {
  it('renders project names after a successful fetch', async () => {
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A, PROJECT_B]);

    renderPayoutTab();

    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('shows "No verified billing profiles" text when all profiles are unverified', async () => {
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);

    renderPayoutTab([UNVERIFIED_PROFILE as never]);

    await waitFor(() =>
      expect(screen.getAllByText('No verified billing profiles')).toHaveLength(1),
    );
  });

  it('renders a select for each project when verified profiles exist', async () => {
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A, PROJECT_B]);

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects).toHaveLength(2);
    });
  });

  it('pre-selects the persisted billing profile for each project', async () => {
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);
    mockGetPayoutMappings.mockResolvedValue([
      { project_id: 'proj-1', billing_profile_id: 1 },
    ]);

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('1');
    });
  });
});

describe('PayoutTab – save button state', () => {
  it('save button is disabled when mappings have not changed', async () => {
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('save button becomes enabled after a mapping change', async () => {
    const user = userEvent.setup();
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '1');

    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });
});

describe('PayoutTab – successful save', () => {
  it('calls savePayoutMappings with the current mappings', async () => {
    const user = userEvent.setup();
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockSavePayoutMappings).toHaveBeenCalledWith([
        { project_id: 'proj-1', billing_profile_id: 1 },
      ]),
    );
  });

  it('shows a success toast and disables the button after saving', async () => {
    const user = userEvent.setup();
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Payout preferences saved'));

    // After save, form is no longer dirty — button re-disables
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('re-enables the save button if the user makes another change after a successful save', async () => {
    const user = userEvent.setup();
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    // First save
    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());

    // Modify again
    await user.selectOptions(screen.getByRole('combobox'), '');

    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });
});

describe('PayoutTab – failed save', () => {
  it('shows an error toast when savePayoutMappings rejects', async () => {
    const user = userEvent.setup();
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);
    mockSavePayoutMappings.mockRejectedValue(new Error('Server error'));

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Server error'),
    );
  });

  it('leaves the form dirty after a failed save so the user can retry', async () => {
    const user = userEvent.setup();
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);
    mockSavePayoutMappings.mockRejectedValue(new Error('Server error'));

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());

    // Button should still be enabled so the user can retry
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });

  it('shows a generic message when the error has no message property', async () => {
    const user = userEvent.setup();
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);
    mockSavePayoutMappings.mockRejectedValue('plain string error');

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Failed to save payout preferences'),
    );
  });
});

describe('PayoutTab – save button during pending request', () => {
  it('shows "Saving…" text and disables the button while the request is in flight', async () => {
    const user = userEvent.setup();
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);

    let resolveSave!: () => void;
    mockSavePayoutMappings.mockReturnValue(
      new Promise<{ ok: boolean }>((resolve) => {
        resolveSave = () => resolve({ ok: true });
      }),
    );

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByRole('button', { name: /save/i }));

    // While in-flight the label changes and the button is disabled
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled(),
    );

    resolveSave();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument(),
    );
  });
});

describe('PayoutTab – getPayoutMappings failure', () => {
  it('gracefully continues rendering even when getPayoutMappings fails', async () => {
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A]);
    mockGetPayoutMappings.mockRejectedValue(new Error('403 Forbidden'));

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());
    // All selects start unselected
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('');
  });
});

describe('PayoutTab – persisted state survives reload', () => {
  it('seeds the selects from getPayoutMappings on mount', async () => {
    mockGetProjectsContributed.mockResolvedValue([PROJECT_A, PROJECT_B]);
    mockGetPayoutMappings.mockResolvedValue([
      { project_id: 'proj-1', billing_profile_id: 1 },
    ]);

    renderPayoutTab([VERIFIED_PROFILE]);

    await waitFor(() => {
      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      expect(selects[0].value).toBe('1');
      expect(selects[1].value).toBe('');
    });
  });
});
