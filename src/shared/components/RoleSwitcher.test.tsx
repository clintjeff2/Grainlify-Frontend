// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleSwitcher } from './RoleSwitcher';
import { renderWithTheme } from '../../test/renderWithTheme';

describe('RoleSwitcher Accessibility and Features', () => {
  const defaultProps = {
    currentRole: 'contributor' as const,
    onRoleChange: vi.fn(),
    showMobileNav: false,
    isSmallDevice: false,
    closeMobileNav: vi.fn(),
  };

  it('renders a labeled radiogroup container and radio buttons', () => {
    renderWithTheme(<RoleSwitcher {...defaultProps} />);
    
    const group = screen.getByRole('radiogroup', { name: 'Role Switcher' });
    expect(group).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    
    expect(screen.getByRole('radio', { name: /CONTRIBUTOR/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /MAINTAINER/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /ADMIN/i })).toBeInTheDocument();
  });

  it('sets correct aria-checked and tabIndex attributes on buttons', () => {
    const { rerender } = renderWithTheme(<RoleSwitcher {...defaultProps} currentRole="contributor" />);

    const contributorRadio = screen.getByRole('radio', { name: /CONTRIBUTOR/i });
    const maintainerRadio = screen.getByRole('radio', { name: /MAINTAINER/i });
    const adminRadio = screen.getByRole('radio', { name: /ADMIN/i });

    expect(contributorRadio).toHaveAttribute('aria-checked', 'true');
    expect(contributorRadio).toHaveAttribute('tabIndex', '0');

    expect(maintainerRadio).toHaveAttribute('aria-checked', 'false');
    expect(maintainerRadio).toHaveAttribute('tabIndex', '-1');

    expect(adminRadio).toHaveAttribute('aria-checked', 'false');
    expect(adminRadio).toHaveAttribute('tabIndex', '-1');

    // Rerender with admin as active
    rerender(<RoleSwitcher {...defaultProps} currentRole="admin" />);
    expect(contributorRadio).toHaveAttribute('aria-checked', 'false');
    expect(contributorRadio).toHaveAttribute('tabIndex', '-1');
    expect(adminRadio).toHaveAttribute('aria-checked', 'true');
    expect(adminRadio).toHaveAttribute('tabIndex', '0');
  });

  it('supports click interactions to change role and close mobile nav', async () => {
    const onRoleChange = vi.fn();
    const closeMobileNav = vi.fn();
    const user = userEvent.setup();

    renderWithTheme(
      <RoleSwitcher 
        {...defaultProps} 
        onRoleChange={onRoleChange} 
        closeMobileNav={closeMobileNav} 
      />
    );

    const maintainerRadio = screen.getByRole('radio', { name: /MAINTAINER/i });
    await user.click(maintainerRadio);

    expect(onRoleChange).toHaveBeenCalledTimes(1);
    expect(onRoleChange).toHaveBeenCalledWith('maintainer');
    expect(closeMobileNav).toHaveBeenCalledTimes(1);
  });

  it('navigates options forward with ArrowRight and ArrowDown keys and wraps around', () => {
    const onRoleChange = vi.fn();
    const closeMobileNav = vi.fn();

    const { rerender } = renderWithTheme(
      <RoleSwitcher 
        {...defaultProps} 
        currentRole="contributor"
        onRoleChange={onRoleChange} 
        closeMobileNav={closeMobileNav} 
      />
    );

    const group = screen.getByRole('radiogroup');
    const contributorRadio = screen.getByRole('radio', { name: /CONTRIBUTOR/i });
    const maintainerRadio = screen.getByRole('radio', { name: /MAINTAINER/i });
    const adminRadio = screen.getByRole('radio', { name: /ADMIN/i });

    // Focus contributor first
    contributorRadio.focus();
    expect(contributorRadio).toHaveFocus();

    // ArrowRight: contributor -> maintainer
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onRoleChange).toHaveBeenLastCalledWith('maintainer');
    expect(maintainerRadio).toHaveFocus();

    // Mock parent component updating props
    rerender(
      <RoleSwitcher 
        {...defaultProps} 
        currentRole="maintainer"
        onRoleChange={onRoleChange} 
        closeMobileNav={closeMobileNav} 
      />
    );

    // ArrowDown: maintainer -> admin
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(onRoleChange).toHaveBeenLastCalledWith('admin');
    expect(adminRadio).toHaveFocus();

    // Mock parent component updating props
    rerender(
      <RoleSwitcher 
        {...defaultProps} 
        currentRole="admin"
        onRoleChange={onRoleChange} 
        closeMobileNav={closeMobileNav} 
      />
    );

    // ArrowRight: admin -> contributor (wrap around)
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onRoleChange).toHaveBeenLastCalledWith('contributor');
    expect(contributorRadio).toHaveFocus();
  });

  it('navigates options backward with ArrowLeft and ArrowUp keys and wraps around', () => {
    const onRoleChange = vi.fn();

    const { rerender } = renderWithTheme(
      <RoleSwitcher 
        {...defaultProps} 
        currentRole="contributor"
        onRoleChange={onRoleChange} 
      />
    );

    const group = screen.getByRole('radiogroup');
    const contributorRadio = screen.getByRole('radio', { name: /CONTRIBUTOR/i });
    const maintainerRadio = screen.getByRole('radio', { name: /MAINTAINER/i });
    const adminRadio = screen.getByRole('radio', { name: /ADMIN/i });

    // Focus contributor first
    contributorRadio.focus();

    // ArrowLeft: contributor -> admin (wrap around)
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(onRoleChange).toHaveBeenLastCalledWith('admin');
    expect(adminRadio).toHaveFocus();

    // Mock parent updating to admin
    rerender(
      <RoleSwitcher 
        {...defaultProps} 
        currentRole="admin"
        onRoleChange={onRoleChange} 
      />
    );

    // ArrowUp: admin -> maintainer
    fireEvent.keyDown(group, { key: 'ArrowUp' });
    expect(onRoleChange).toHaveBeenLastCalledWith('maintainer');
    expect(maintainerRadio).toHaveFocus();
  });

  it('supports availableRoles filtering and navigates within subset', () => {
    const onRoleChange = vi.fn();

    const { rerender } = renderWithTheme(
      <RoleSwitcher 
        {...defaultProps} 
        currentRole="contributor"
        onRoleChange={onRoleChange}
        availableRoles={['contributor', 'maintainer']}
      />
    );

    // Contributor and Maintainer should exist, Admin should not
    expect(screen.getByRole('radio', { name: /CONTRIBUTOR/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /MAINTAINER/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /ADMIN/i })).not.toBeInTheDocument();

    const group = screen.getByRole('radiogroup');
    const contributorRadio = screen.getByRole('radio', { name: /CONTRIBUTOR/i });
    const maintainerRadio = screen.getByRole('radio', { name: /MAINTAINER/i });

    contributorRadio.focus();

    // ArrowRight: contributor -> maintainer
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onRoleChange).toHaveBeenLastCalledWith('maintainer');
    expect(maintainerRadio).toHaveFocus();

    // Mock parent update
    rerender(
      <RoleSwitcher 
        {...defaultProps} 
        currentRole="maintainer"
        onRoleChange={onRoleChange}
        availableRoles={['contributor', 'maintainer']}
      />
    );

    // ArrowRight: maintainer -> contributor (wrap around)
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onRoleChange).toHaveBeenLastCalledWith('contributor');
    expect(contributorRadio).toHaveFocus();
  });

  it('renders lock badge on Admin with correct role and accessible labels', () => {
    renderWithTheme(<RoleSwitcher {...defaultProps} />);

    // Lock badge wrapper
    const lockBadge = screen.getByRole('img', { name: 'Admin role locked' });
    expect(lockBadge).toBeInTheDocument();

    // Lock icon inside badge
    const lockIcon = screen.getByLabelText('Locked');
    expect(lockIcon).toBeInTheDocument();
    expect(lockIcon).toHaveAttribute('aria-hidden', 'false');
  });

  it('adds descriptive aria-label and aria-hidden="false" attributes to all role icons', () => {
    renderWithTheme(<RoleSwitcher {...defaultProps} />);

    const contributorIcon = screen.getByLabelText('contributor icon');
    const maintainerIcon = screen.getByLabelText('maintainer icon');
    const adminIcon = screen.getByLabelText('admin icon');

    expect(contributorIcon).toBeInTheDocument();
    expect(contributorIcon).toHaveAttribute('aria-hidden', 'false');
    
    expect(maintainerIcon).toBeInTheDocument();
    expect(maintainerIcon).toHaveAttribute('aria-hidden', 'false');

    expect(adminIcon).toBeInTheDocument();
    expect(adminIcon).toHaveAttribute('aria-hidden', 'false');
  });

  it('handles tabIndex when currentRole is not found in visible roles list', () => {
    renderWithTheme(
      <RoleSwitcher 
        {...defaultProps} 
        currentRole="admin" 
        availableRoles={['contributor', 'maintainer']} 
      />
    );

    const contributorRadio = screen.getByRole('radio', { name: /CONTRIBUTOR/i });
    const maintainerRadio = screen.getByRole('radio', { name: /MAINTAINER/i });

    // Since 'admin' is currentRole but not in availableRoles, the first role (contributor) should get tabIndex=0
    expect(contributorRadio).toHaveAttribute('tabIndex', '0');
    expect(maintainerRadio).toHaveAttribute('tabIndex', '-1');
  });

  it('handles arrow key navigation when currentRole is not in the visible roles list', () => {
    const onRoleChange = vi.fn();

    renderWithTheme(
      <RoleSwitcher 
        {...defaultProps} 
        currentRole="admin" 
        availableRoles={['contributor', 'maintainer']}
        onRoleChange={onRoleChange}
      />
    );

    const group = screen.getByRole('radiogroup');

    // ArrowRight should focus and select the first visible role (contributor)
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onRoleChange).toHaveBeenCalledWith('contributor');
  });

  it('hides component on large nav when showMobileNav is false', () => {
    renderWithTheme(<RoleSwitcher {...defaultProps} showMobileNav={false} />);
    const group = screen.getByRole('radiogroup');
    expect(group.className).toContain('hidden lg:inline-flex');
  });

  it('shows component when showMobileNav is true', () => {
    renderWithTheme(<RoleSwitcher {...defaultProps} showMobileNav={true} />);
    const group = screen.getByRole('radiogroup');
    expect(group.className).toContain('inline-flex');
  });
});
