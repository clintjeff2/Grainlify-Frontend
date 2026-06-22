import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingTab } from './BillingTab';
import { toast } from 'sonner';

// Mock contexts and hooks
vi.mock('../../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// We'll mock the hook to control the profiles state
const mockProfiles = [
  { id: 1, name: 'John Doe', type: 'individual', status: 'verified' }
];

const mockAddProfile = vi.fn();

vi.mock('../../contexts/BillingProfilesContext', () => ({
  useBillingProfiles: () => ({
    profiles: mockProfiles,
    setProfiles: vi.fn(),
    addProfile: mockAddProfile,
    updateProfile: vi.fn(),
  }),
}));

// Mock the API client
vi.mock('../../../../shared/api/client', () => ({
  getBillingProfiles: vi.fn().mockResolvedValue([]),
  getKYCStatus: vi.fn().mockResolvedValue({ status: 'verified' }),
  startKYCVerification: vi.fn().mockResolvedValue({ url: 'https://example.com' }),
}));

describe('BillingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_USE_MOCK_DATA', 'true');
  });

  it('shows an error toast when trying to create a duplicate individual profile', async () => {
    render(<BillingTab />);
    
    // Open modal
    const newProfileBtn = await screen.findByText('New Profile');
    fireEvent.click(newProfileBtn);
    
    // Fill in a valid name
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    
    // Try to create
    const createBtn = screen.getByRole('button', { name: 'Create' });
    fireEvent.click(createBtn);
    
    // Toast should be called
    expect(toast.error).toHaveBeenCalledWith('An individual billing profile already exists. You can only create one individual profile.');
    
    // addProfile should not have been called
    expect(mockAddProfile).not.toHaveBeenCalled();
  });
});
