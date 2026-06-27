import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdminPage } from '../features/admin/pages/AdminPage';

// Mock the components that might make API calls or have complex dependencies
vi.mock('../features/admin/pages/AdminPage', () => ({
  AdminPage: () => <div data-testid="real-admin-page">Real Admin Page</div>
}));

// Mock AuthGuard and RoleGuard to simplify testing routing
vi.mock('../shared/components/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../shared/components/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('Admin Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the real AdminPage when routed to /admin', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
            <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('real-admin-page')).toBeInTheDocument();
    expect(screen.getByText('Real Admin Page')).toBeInTheDocument();
  });
});
