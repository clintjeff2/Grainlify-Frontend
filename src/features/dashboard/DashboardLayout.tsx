import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Search,
  Compass,
  Grid3x3,
  Calendar,
  Globe,
  Users,
  Trophy,
  Database,
  FileText,
  ChevronRight,
  Moon,
  Sun,
  Shield,
  X,
  Menu
} from "lucide-react";
import { useModeAnimation } from "react-theme-switch-animation";
import { useAuth } from "../../shared/contexts/AuthContext";
import grainlifyLogo from "../../assets/grainlify_log.svg";
import { useTheme } from "../../shared/contexts/ThemeContext";
import { UserProfileDropdown } from "../../shared/components/UserProfileDropdown";
import { NotificationsDropdown } from "../../shared/components/NotificationsDropdown";
import { RoleSwitcher } from "../../shared/components/RoleSwitcher";
import {
  Modal,
  ModalFooter,
  ModalButton,
  ModalInput,
} from "../../shared/components/ui/Modal";
import { bootstrapAdmin } from "../../shared/api/client";

export function DashboardLayout() {
  const { login } = useAuth();
  const { theme, setThemeFromAnimation } = useTheme();
  const location = useLocation();
  const { ref: themeToggleRef, toggleSwitchTheme } = useModeAnimation({
    isDarkMode: theme === "dark",
    onDarkModeChange: (isDark) => setThemeFromAnimation(isDark),
  });
  const navigate = useNavigate();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
     typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [activeRole, setActiveRole] = useState<"contributor" | "maintainer" | "admin">("contributor");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deviceWidth, setDeviceWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : null
  );

  // Admin password gating (bootstrap token)
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem("admin_authenticated") === "true";
  });
  const [_pendingAdminTarget, setPendingAdminTarget] = useState<"nav" | "role" | null>(null);

  useEffect(() => { 
    const handleResize = () => {
      setDeviceWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get current page from URL path
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard/discover')) return 'discover';
    if (path.startsWith('/dashboard/browse')) return 'browse';
    if (path.startsWith('/dashboard/open-source-week')) return 'osw';
    if (path.startsWith('/dashboard/ecosystems')) return 'ecosystems';
    if (path.startsWith('/dashboard/contributors')) return 'contributors';
    if (path.startsWith('/dashboard/maintainers')) return 'maintainers';
    if (path.startsWith('/dashboard/data')) return 'data';
    if (path.startsWith('/dashboard/leaderboard')) return 'leaderboard';
    if (path.startsWith('/dashboard/blog')) return 'blog';
    if (path.startsWith('/dashboard/settings')) return 'settings';
    if (path.startsWith('/dashboard/admin')) return 'admin';
    if (path.startsWith('/dashboard/search')) return 'search';
    if (path.startsWith('/dashboard/profile')) return 'profile';
    return 'discover';
  };

  const currentPage = getCurrentPage();

  const handleNavigation = (page: string) => {
    navigate(`/dashboard/${page}`);
    setMobileMenuOpen(false);
  };


  const openAdminAuthModal = (target: "nav" | "role") => {
    setPendingAdminTarget(target);
    setShowAdminPasswordModal(true);
  };


  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) return;
    setIsAuthenticating(true);
    try {
      const response = await bootstrapAdmin(adminPassword.trim());
      await login(response.token);
      setAdminAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      setShowAdminPasswordModal(false);
      setAdminPassword("");
      setActiveRole("admin");
      handleNavigation("admin");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Admin authentication failed:", error);
      setAdminPassword("");
    } finally {
      setIsAuthenticating(false);
      setPendingAdminTarget(null);
    }
  };

  const handleRoleChange = (role: "contributor" | "maintainer" | "admin") => {
    if (role === "admin") {
      if (adminAuthenticated) {
        setActiveRole("admin");
        handleNavigation("admin");
      } else {
        openAdminAuthModal("role");
      }
      return;
    }
    setActiveRole(role);
    if (role === "maintainer") {
      handleNavigation("maintainers");
    } else {
      handleNavigation("discover");
    }
  };

  const closeMobileNav = () => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  // Role-based navigation items
  const navItems = [
    { id: "discover", icon: Compass, label: "Discover", path: "/dashboard/discover" },
    { id: "browse", icon: Grid3x3, label: "Browse", path: "/dashboard/browse" },
    { id: "osw", icon: Calendar, label: "Open-Source Week", path: "/dashboard/open-source-week" },
    { id: "ecosystems", icon: Globe, label: "Ecosystems", path: "/dashboard/ecosystems" },
    activeRole === "maintainer" || activeRole === "admin"
      ? { id: "maintainers", icon: Users, label: "Maintainers", path: "/dashboard/maintainers" }
      : { id: "contributors", icon: Users, label: "Contributors", path: "/dashboard/contributors" },
    ...(activeRole === "admin"
      ? [{ id: "data", icon: Database, label: "Data", path: "/dashboard/data" }]
      : []),
    { id: "leaderboard", icon: Trophy, label: "Leaderboard", path: "/dashboard/leaderboard" },
    { id: "blog", icon: FileText, label: "Grainlify Blog", path: "/dashboard/blog" },
  ];

  const darkTheme = theme === "dark";
  const isSmallDevice = deviceWidth && deviceWidth < 1024;
  const showMobileNav = mobileMenuOpen && isSmallDevice;

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors ${
        darkTheme
          ? "bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]"
          : "bg-gradient-to-br from-[#c4b5a0] via-[#b8a590] to-[#a89780]"
      }`}
    >
      {/* Subtle Background Texture */}
      <div className="fixed inset-0 opacity-40">
        <div
          className={`absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-radial blur-[100px] ${
            darkTheme
              ? "from-[#c9983a]/10 to-transparent"
              : "from-[#d4c4b0]/30 to-transparent"
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-[900px] h-[900px] bg-gradient-radial blur-[120px] ${
            darkTheme
              ? "from-[#c9983a]/5 to-transparent"
              : "from-[#b8a898]/20 to-transparent"
          }`}
        />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-2 left-2 bottom-2 z-50 transition-all duration-300 ${isSidebarCollapsed ? "w-[65px] mr-2" : "w-56 mr-2"}`}
      >
        {/* Toggle Arrow Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute z-[100] backdrop-blur-[90px] rounded-full border-[0.5px] w-6 h-6 shadow-md hover:shadow-lg transition-all flex items-center justify-center ${
            isSidebarCollapsed ? "-right-3 top-[60px]" : "-right-3 top-[60px]"
          } ${
            darkTheme
              ? "bg-[#2d2820]/[0.85] border-[rgba(201,152,58,0.2)]"
              : "bg-white/[0.85] border-[rgba(245,239,235,0.32)]"
          }`}
        >
          <ChevronRight
            className={`w-3 h-3 text-[#c9983a] transition-transform duration-300 ${isSidebarCollapsed ? "" : "rotate-180"}`}
          />
        </button>

        <div
          className={`h-full backdrop-blur-[90px] rounded-[29px] border shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] relative overflow-y-auto scrollbar-hide transition-colors ${
            darkTheme
              ? "bg-[#2d2820]/[0.4] border-white/10"
              : "bg-white/[0.35] border-white/20"
          }`}
        >
          <div className="flex flex-col h-full px-0 py-[40px]">
            {/* Logo/Avatar */}
            <div
              className={`flex items-center mb-6 transition-all ${isSidebarCollapsed ? "px-[8px] justify-center" : "px-2 justify-start"}`}
            >
              {isSidebarCollapsed ? (
                <img
                  src={grainlifyLogo}
                  alt="Grainlify"
                  className="w-12 h-12 grainlify-logo"
                />
              ) : (
                <div className="flex items-center space-x-3">
                  <img
                    src={grainlifyLogo}
                    alt="Grainlify"
                    className="w-12 h-12 grainlify-logo"
                  />
                  <span
                    className={`text-[20px] font-bold transition-colors ${
                      darkTheme ? "text-[#f5efe5]" : "text-[#2d2820]"
                    }`}
                  >
                    Grainlify
                  </span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div
              className="h-[0.5px] opacity-[0.24] mb-6 mx-auto"
              style={{
                width: isSidebarCollapsed ? "60px" : "100%",
                backgroundImage:
                  'url(\'data:image/svg+xml;utf8,<svg viewBox="0 0 104 0.5" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><rect x="0" y="0" height="100%" width="100%" fill="url(%23grad)" opacity="1"/><defs><radialGradient id="grad" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="10" gradientTransform="matrix(3.1841e-16 0.025 -5.2 1.5308e-18 52 0.25)"><stop stop-color="rgba(67,44,44,1)" offset="0"/><stop stop-color="rgba(80,28,28,0)" offset="1"/></radialGradient></defs></svg>\')',
              }}
            />

            {/* Main Navigation */}
            <nav
              className={`space-y-2 mb-auto ${isSidebarCollapsed ? "px-[8px]" : "px-2"}`}
            >
              {navItems.map((item) => {
                const isActive = currentPage === item.id;
                const Icon = item.icon as any;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    aria-current={isActive ? "page" : undefined}
                    className={`group w-full flex items-center rounded-[12px] transition-all duration-300 ${
                      isSidebarCollapsed
                        ? "justify-center px-0 h-[49px]"
                        : "justify-start px-3 py-2.5"
                    } ${
                      isActive
                        ? "bg-[#c9983a] shadow-[inset_0px_0px_4px_0px_rgba(255,255,255,0.25)] border-[0.5px] border-[rgba(245,239,235,0.16)]"
                        : darkTheme
                          ? "hover:bg-white/[0.08]"
                          : "hover:bg-white/[0.1]"
                    }`}
                    title={isSidebarCollapsed ? item.label : ""}
                  >
                    <Icon
                      className={`w-6 h-6 transition-colors ${isSidebarCollapsed ? "" : "flex-shrink-0"} ${
                        isActive
                          ? "text-white"
                          : darkTheme
                            ? "text-[#e8c77f]"
                            : "text-[#a2792c]"
                      }`}
                    />
                    {!isSidebarCollapsed && (
                      <span
                        className={`ml-3 font-medium text-[14px] ${
                          isActive
                            ? "text-white"
                            : darkTheme
                              ? "text-[#d4c5b0]"
                              : "text-[#6b5d4d]"
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`mr-2 my-2 relative z-10 transition-all duration-300 ${isSidebarCollapsed ? "ml-[81px]" : "ml-[240px]"}`}
      >
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div
            className={`fixed top-2 right-2 left-auto z-[9999] flex items-center gap-1 md:gap-2 lg:gap-3 lg:h-[52px] py-3 rounded-[26px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] backdrop-blur-[90px] border transition-all duration-300 ${
              isSidebarCollapsed ? "ml-[81px]" : "ml-[240px]"
            } ${
              darkTheme
                ? "bg-[#2d2820]/[0.4] border-white/10 shadow-[inset_0px_0px_9px_0px_rgba(201,152,58,0.1)]"
                : "bg-white/[0.35] border-white shadow-[inset_0px_0px_9px_0px_rgba(255,255,255,0.5)]"
            } ${showMobileNav ? "h-screen flex-col":"" } 
          `}
            style={{
              width: `calc(100vw - ${isSidebarCollapsed ? "81px" : "240px"} - 8px - 8px)`,
            }}
          >
          
          {/* Mobile nav view header */}
          {showMobileNav &&  
            <div className="flex items-center justify-between w-full px-4"> 
            <Link to="/" className="flex items-center space-x-3 mr-auto">
              <img src={grainlifyLogo} alt="Grainlify" className="w-8 h-8 grainlify-logo" />
              <span className={`text-xl font-semibold transition-colors ${
                   theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
                 }`}>Grainlify</span>
            </Link>

            <button
              className={`lg:hidden transition-colors self-end ${showMobileNav ? 'block' : 'hidden'} ${
                   theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
                 }`}
                 onClick={() => setMobileMenuOpen(false)}
                 >
              <X size={24} />
            </button>
            </div>
          }

          {/* Search */}
          <Link
            to="/dashboard/search"
            className={`relative h-[46px] lg:flex-1 rounded-[23px] overflow-visible backdrop-blur-[40px] shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] ml-[3px] transition-all hover:scale-[1.01] cursor-pointer ${
              darkTheme ? "bg-[#2d2820]" : "bg-[#d4c5b0]"
            } ${showMobileNav ? 'min-h-[46px] w-[80%] max-w-[800px] block': 'lg:block hidden'}`}
          >
            <div
              className={`absolute inset-0 pointer-events-none rounded-[23px] ${
                darkTheme
                  ? "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.5),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.11)]"
                  : "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.15),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.35)]"
              }`}
            />
            <div className="relative h-full flex items-center px-2 lg:px-5 justify-between">
              <div className="flex items-center flex-1">
                <Search
                  className={`w-4 h-4 mr-3 flex-shrink-0 transition-colors ${
                    darkTheme
                      ? "text-[rgba(255,255,255,0.69)]"
                      : "text-[rgba(45,40,32,0.75)]"
                  }`}
                />
                <span
                  className={`text-[13px] transition-colors ${
                    darkTheme
                      ? "text-[rgba(255,255,255,0.5)]"
                      : "text-[rgba(45,40,32,0.5)]"
                  }`}
                >
                  <span className="sm:hidden">Search</span>
                  <span className="hidden sm:inline md:hidden">
                    Search projects
                  </span>
                  <span className="hidden md:inline lg:hidden">
                    Search projects, issues
                  </span>
                  <span className="hidden lg:inline">
                    Search projects, issues, contributors...
                  </span>
                </span>
              </div>

              <div
                className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded border"
                style={{
                  backgroundColor: darkTheme
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.08)",
                  borderColor: darkTheme
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(0, 0, 0, 0.15)",
                }}
              >
                <span
                  className="text-[11px] font-medium"
                  style={{
                    color: darkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.7)",
                  }}
                >
                  ⌘
                </span>
                <span
                  className="text-[11px] font-medium"
                  style={{
                    color: darkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.7)",
                  }}
                >
                  K
                </span>
              </div>
            </div>
          </Link>
               
          {/* Role Switcher */}
          <RoleSwitcher
            currentRole={activeRole}
            isSmallDevice={!!isSmallDevice}
            showMobileNav={!!showMobileNav}
            closeMobileNav={closeMobileNav}
            onRoleChange={handleRoleChange}
          />

          {/* Theme Toggle */}
          <button
            ref={themeToggleRef}
            onClick={() => {
              toggleSwitchTheme();
              closeMobileNav();
            }}
            className={`h-[46px] lg:w-[46px] overflow-clip relative items-center justify-center backdrop-blur-[40px] transition-all hover:scale-105 shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] ${
              darkTheme ? "bg-[#2d2820] text-[#e8dfd0]" : "bg-[#d4c5b0] text-[#2d2820]"
            }
            ${showMobileNav ? ' flex rounded-sm w-[80%] max-w-[800px] ' : ' hidden lg:flex rounded-full '}`}
            title={darkTheme ? "Switch to light mode" : "Switch to dark mode"}
          >
            <div
              className={`absolute inset-0 pointer-events-none ${
                darkTheme
                  ? "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.5),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.11)]"
                  : "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.15),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.35)]"
              } ${showMobileNav? 'rounded-sm': 'rounded-full'}`}
            />
            {darkTheme ? (
              <Sun
                className={`w-4 h-4 relative z-10 transition-colors ${
                  darkTheme
                    ? "text-[rgba(255,255,255,0.69)]"
                    : "text-[rgba(45,40,32,0.75)]"
                }`}
              />
            ) : (
              <Moon
                className={`w-4 h-4 relative z-10 transition-colors ${
                  darkTheme
                    ? "text-[rgba(255,255,255,0.69)]"
                    : "text-[rgba(45,40,32,0.75)]"
                }`}
              />
            )}
             <span className='ml-2 lg:hidden'>
            {

             showMobileNav && darkTheme ?"Light Mode" :"Dark Mode"
             }
             </span>
          </button>

          {/* Notifications Dropdown */}
          <NotificationsDropdown showMobileNav={!!showMobileNav} closeMobileNav={closeMobileNav}/>

          {/* User Profile Dropdown */}
          <UserProfileDropdown onPageChange={handleNavigation} showMobileNav={!!showMobileNav} />
          
          {/* Mobile nav open button */}
          <button
            className={`lg:hidden transition-colors ml-auto mr-[8px] ${showMobileNav? 'hidden' : 'block'} ${
              theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          </div>

          {/* Page Content - Outlet for nested routes */}
          <div className="pt-[68px]">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Admin Password Modal */}
      <Modal
        isOpen={showAdminPasswordModal}
        onClose={() => {
          setShowAdminPasswordModal(false);
          setAdminPassword("");
          setPendingAdminTarget(null);
        }}
        title="Admin Authentication"
        icon={<Shield className="w-6 h-6 text-[#c9983a]" />}
        width="md"
      >
        <form onSubmit={handleAdminPasswordSubmit}>
          <div className="space-y-4">
            <p
              className={`text-sm ${darkTheme ? "text-[#d4d4d4]" : "text-[#7a6b5a]"}`}
            >
              Enter the admin password to access the admin panel.
            </p>
            <ModalInput
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(value) => setAdminPassword(value || "")}
              required
            />
            <p
              className={`text-xs ${darkTheme ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}
            >
              Tip: This must match the backend `ADMIN_BOOTSTRAP_TOKEN`.
            </p>
          </div>
          <ModalFooter>
            <ModalButton
              variant="secondary"
              onClick={() => {
                setShowAdminPasswordModal(false);
                setAdminPassword("");
                setPendingAdminTarget(null);
              }}
              disabled={isAuthenticating}
            >
              Cancel
            </ModalButton>
            <ModalButton
              variant="primary"
              type="submit"
              disabled={isAuthenticating || !adminPassword.trim()}
            >
              {isAuthenticating ? "Authenticating..." : "Authenticate"}
            </ModalButton>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
