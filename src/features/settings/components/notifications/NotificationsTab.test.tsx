// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { renderWithTheme } from '../../../../test/renderWithTheme';
import { NotificationsTab } from './NotificationsTab';

// Mock client and sonner
const mockGetNotificationSettings = vi.fn();
const mockUpdateNotificationSettings = vi.fn();

vi.mock('../../../../shared/api/client', () => ({
  getNotificationSettings: (...args: unknown[]) => mockGetNotificationSettings(...args),
  updateNotificationSettings: (...args: unknown[]) => mockUpdateNotificationSettings(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSettings = {
  globalBillingEmail: false,
  globalBillingWeekly: false,
  globalMarketingEmail: false,
  globalMarketingWeekly: false,
  contributorProjectEmail: false,
  contributorProjectWeekly: false,
  contributorRewardEmail: false,
  contributorRewardWeekly: false,
  contributorRewardAcceptedEmail: false,
  contributorRewardAcceptedWeekly: false,
  maintainerProjectContributorEmail: false,
  maintainerProjectContributorWeekly: false,
  maintainerProjectProgramEmail: false,
  maintainerProjectProgramWeekly: false,
  programsTransactionsEmail: false,
  programsTransactionsWeekly: false,
  sponsorsTransactionsEmail: false,
  sponsorsTransactionsWeekly: false,
};

describe('NotificationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner and then load settings', async () => {
    mockGetNotificationSettings.mockResolvedValue(mockSettings);
    renderWithTheme(<NotificationsTab />);

    expect(screen.getByLabelText('Loading settings')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Loading settings')).not.toBeInTheDocument();
  });

  it('shows error toast if load fails', async () => {
    mockGetNotificationSettings.mockRejectedValue(new Error('Network error'));
    renderWithTheme(<NotificationsTab />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load notification settings.');
    });
  });

  it('toggles setting optimistically and remains enabled on success', async () => {
    mockGetNotificationSettings.mockResolvedValue(mockSettings);
    mockUpdateNotificationSettings.mockResolvedValue({ ok: true });
    
    renderWithTheme(<NotificationsTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Email notifications for Billing Profile');
    expect(toggleButton).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(toggleButton);

    // Optimistically updated
    expect(toggleButton).toHaveAttribute('aria-checked', 'true');

    // Persisted to API
    expect(mockUpdateNotificationSettings).toHaveBeenCalledWith(
      expect.objectContaining({ globalBillingEmail: true })
    );
  });

  it('reverts the switch state and shows error toast on save failure', async () => {
    mockGetNotificationSettings.mockResolvedValue(mockSettings);
    mockUpdateNotificationSettings.mockRejectedValue(new Error('API failure'));
    
    renderWithTheme(<NotificationsTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Email notifications for Billing Profile');
    expect(toggleButton).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(toggleButton);

    // Reverted back to false
    await waitFor(() => {
      expect(toggleButton).toHaveAttribute('aria-checked', 'false');
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to update notification settings. Reverting change.');
  });

  it('disables the toggle switch while update is in flight', async () => {
    let resolveApiPromise: (value: { ok: boolean }) => void = () => {};
    const apiPromise = new Promise<{ ok: boolean }>((resolve) => {
      resolveApiPromise = resolve;
    });

    mockGetNotificationSettings.mockResolvedValue(mockSettings);
    mockUpdateNotificationSettings.mockReturnValue(apiPromise);
    
    renderWithTheme(<NotificationsTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Email notifications for Billing Profile');
    
    await userEvent.click(toggleButton);

    // Optimistically checked and in-flight (disabled)
    expect(toggleButton).toHaveAttribute('aria-checked', 'true');
    expect(toggleButton).toBeDisabled();

    // Resolve API call
    resolveApiPromise({ ok: true });

    // No longer disabled
    await waitFor(() => {
      expect(toggleButton).not.toBeDisabled();
    });
  });

  it('handles enable all successfully', async () => {
    mockGetNotificationSettings.mockResolvedValue(mockSettings);
    mockUpdateNotificationSettings.mockResolvedValue({ ok: true });
    
    renderWithTheme(<NotificationsTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const enableAllBtn = screen.getByText('Enable all');
    await userEvent.click(enableAllBtn);

    const toggleButton = screen.getByLabelText('Email notifications for Billing Profile');
    expect(toggleButton).toHaveAttribute('aria-checked', 'true');
    expect(toast.success).toHaveBeenCalledWith('All notifications enabled');
  });

  it('handles disable all successfully', async () => {
    const allEnabledSettings = Object.keys(mockSettings).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as any);

    mockGetNotificationSettings.mockResolvedValue(allEnabledSettings);
    mockUpdateNotificationSettings.mockResolvedValue({ ok: true });
    
    renderWithTheme(<NotificationsTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const disableAllBtn = screen.getByText('Disable all');
    await userEvent.click(disableAllBtn);

    const toggleButton = screen.getByLabelText('Email notifications for Billing Profile');
    expect(toggleButton).toHaveAttribute('aria-checked', 'false');
    expect(toast.success).toHaveBeenCalledWith('All notifications disabled');
  });
});
