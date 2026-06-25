import { useRef } from 'react';
import { Shield, Users, Code, Lock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Valid roles that can be selected in the RoleSwitcher.
 */
export type RoleSwitcherRole = 'contributor' | 'maintainer' | 'admin';

/**
 * Properties for the RoleSwitcher component.
 */
interface RoleSwitcherProps {
  /** The currently selected user role. */
  currentRole: RoleSwitcherRole;
  /** Callback fired when a role selection changes. */
  onRoleChange: (role: RoleSwitcherRole) => void;
  /** Flag showing whether mobile navigation view is open. */
  showMobileNav: boolean;
  /** Flag indicating if the device is a small screen/mobile device. */
  isSmallDevice: boolean;
  /** Callback to close the mobile navigation view. */
  closeMobileNav: () => void;
  /** Optional subset of roles to display. Defaults to all roles if omitted. */
  availableRoles?: RoleSwitcherRole[];
}

/**
 * RoleSwitcher Component
 * 
 * Renders a segmented navigation control for switching between user roles. Uses `role="radiogroup"`
 * for accessibility, supports Arrow Key navigation with auto-wrap, and provides explicit
 * aria-labels for icons and badges.
 * 
 * @param props - The configuration props for RoleSwitcher.
 * @returns A JSX element representing the RoleSwitcher.
 */
export function RoleSwitcher({
  currentRole,
  onRoleChange,
  showMobileNav,
  closeMobileNav,
  availableRoles,
}: RoleSwitcherProps) {
  const { theme } = useTheme();
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const allRoles = [
    { id: 'contributor' as const, label: 'CONTRIBUTOR', icon: Code },
    { id: 'maintainer' as const, label: 'MAINTAINER', icon: Users },
    { id: 'admin' as const, label: 'ADMIN', icon: Shield },
  ];

  const roles = availableRoles
    ? allRoles.filter((r) => availableRoles.includes(r.id))
    : allRoles;

  const hasChecked = roles.some((r) => r.id === currentRole);

  /**
   * Handles keyboard navigation inside the radiogroup using arrow keys.
   * Enables wrap-around selection and focus.
   * 
   * @param e - The keyboard event object.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = roles.findIndex((r) => r.id === currentRole);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentIndex === -1) {
        nextIndex = 0;
      } else {
        nextIndex = (currentIndex + 1) % roles.length;
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex === -1) {
        nextIndex = roles.length - 1;
      } else {
        nextIndex = (currentIndex - 1 + roles.length) % roles.length;
      }
    }

    if (nextIndex !== currentIndex && nextIndex >= 0 && nextIndex < roles.length) {
      const nextRole = roles[nextIndex];
      onRoleChange(nextRole.id);
      closeMobileNav();
      
      // Schedule focus for screen-readers and visual consistency
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div 
      role="radiogroup"
      aria-label="Role Switcher"
      onKeyDown={handleKeyDown}
      className={`w-[80%] lg:w-auto max-w-[800px] lg:max-w-none flex-col lg:flex-row gap-[8px] lg:gap-[2px] lg:h-[44px] items-start p-[2px] rounded-[10px] lg:rounded-[999px] shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] ${
        theme === 'dark'
          ? 'bg-[#1a1612]'
          : 'bg-[#8b7d6b]'
      }
      ${showMobileNav? 'inline-flex' : 'hidden lg:inline-flex'}
      `}
    >
      {roles.map((role, index) => {
        const Icon = role.icon;
        const isActive = currentRole === role.id;
        const isFirst = index === 0;
        const isLast = index === roles.length - 1;
        const tabIndex = isActive || (!hasChecked && index === 0) ? 0 : -1;
        
        return (
          <button
            key={role.id}
            role="radio"
            aria-checked={isActive}
            tabIndex={tabIndex}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            onClick={() => {
              onRoleChange(role.id);
              closeMobileNav();
            }}
            className={`h-[40px] relative shrink-0 w-full lg:w-[130px] px-3 ${
              isFirst ? 'rounded-bl-[10px] lg:rounded-bl-[20px] rounded-br-[4px] rounded-tl-[10px] lg:rounded-tl-[20px] rounded-tr-[4px] ' :
              isLast ? 'rounded-bl-[4px] rounded-br-[10px] lg:rounded-br-[20px] rounded-tl-[4px] rounded-tr-[10px] lg:rounded-tr-[20px]' :
              'rounded-[4px]'
            } ${
              isActive
                ? theme === 'dark'
                  ? 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e]'
                  : 'bg-gradient-to-br from-[#e8c571] to-[#c9983a]'
                : theme === 'dark'
                ? 'bg-[#2d2820]'
                : 'bg-[#d4c5b0]'
            }`}
          >
            {/* Button Content */}
            <div className={`absolute flex items-center justify-center gap-2 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap ${
              isActive
                ? 'text-white'
                : theme === 'dark'
                ? 'text-[rgba(255,255,255,0.69)]'
                : 'text-[rgba(45,40,32,0.75)]'
            }`}>
              <Icon 
                aria-label={`${role.id} icon`}
                aria-hidden="false"
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                  isActive ? '' : 'opacity-80'
                }`} 
              />
              
              <span className={`text-[11px] font-medium leading-[0] tracking-wide ${
                isActive ? 'text-shadow-[0px_1px_2px_rgba(0,0,0,0.3)]' : 'text-shadow-[0px_1px_0px_rgba(0,0,0,0.19)]'
              }`}>
                {role.label}
              </span>
            </div>

            {/* Lock Badge for Admin - Restricted Access Indicator */}
            {role.id === 'admin' && (
              <div 
                role="img"
                aria-label="Admin role locked"
                className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-[#e8c571] to-[#c9983a] rounded-full shadow-[0_2px_8px_rgba(201,152,58,0.9),0_0_12px_rgba(201,152,58,0.7)] z-20 flex items-center justify-center border-[2px] border-white"
              >
                <Lock 
                  aria-label="Locked"
                  aria-hidden="false"
                  className="w-2.5 h-2.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" 
                  strokeWidth={3} 
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}