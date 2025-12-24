import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, User } from '../services/authService';
import { LayoutDashboard, Database, Plug, User as UserIcon, LogOut } from 'lucide-react';
import Spinner from './ui/Spinner';
import { IStaticMethods } from 'preline/preline';

declare global {
  interface Window {
    HSStaticMethods: IStaticMethods;
  }
}

type MenuOption = 'dashboard' | 'knowledge-bases' | 'connectors';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine active menu from URL
  const getActiveMenuFromPath = (): MenuOption => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/dashboard/') return 'dashboard';
    if (path.includes('/knowledge-bases')) return 'knowledge-bases';
    if (path.includes('/connectors')) return 'connectors';
    return 'dashboard';
  };

  const [activeMenu, setActiveMenu] = useState<MenuOption>(getActiveMenuFromPath());

  // Update active menu when route changes
  useEffect(() => {
    setActiveMenu(getActiveMenuFromPath());
  }, [location.pathname]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          try {
            const freshUser = await authService.getCurrentUser();
            setUser(freshUser);
          } catch (error) {
            console.error('Failed to fetch user:', error);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Initialize Preline UI for sidebar overlay minifier
  useEffect(() => {
    if (loading) return;

    const initPreline = () => {
      // Wait for Preline to be available
      if (!window.HSStaticMethods) return;

      // Reinitialize Preline to pick up new DOM elements
      window.HSStaticMethods.autoInit();

      // Ensure overlay minifier is bound to the toggle
      const sidebarElement = document.getElementById('hs-sidebar-content-push-to-mini-sidebar');
      const toggleButton = document.querySelector(
        '[data-hs-overlay-minifier="#hs-sidebar-content-push-to-mini-sidebar"]'
      ) as HTMLElement | null;

      if (sidebarElement && toggleButton) {
        // Use type assertion to access overlayMinifier if it exists at runtime
        const hsMethods = window.HSStaticMethods as any;
        if (hsMethods.overlayMinifier) {
          try {
            hsMethods.overlayMinifier(toggleButton);
          } catch (e) {
            console.warn('Preline overlay minifier init error', e);
          }
        }
      }
    };

    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      initPreline();
    }, 200);

    return () => clearTimeout(timer);
  }, [loading, location.pathname]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const menuOptions: { 
    id: MenuOption; 
    label: string; 
    path: string; 
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { id: 'knowledge-bases', label: 'Knowledge Bases', path: '/knowledge-bases', icon: Database },
    { id: 'connectors', label: 'Connectors', path: '/connectors', icon: Plug },
  ];

  const handleMenuClick = (option: MenuOption, path: string) => {
    setActiveMenu(option);
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Toggle - Mobile */}
      <div className="lg:hidden py-4 px-4">
        <button
          type="button"
          className="py-2 px-3 inline-flex justify-center items-center gap-x-2 text-start bg-gray-800 border border-gray-800 text-white text-sm font-medium rounded-lg shadow-sm align-middle hover:bg-gray-950 focus:outline-none focus:bg-gray-900"
          aria-haspopup="dialog"
          aria-expanded="false"
          aria-controls="hs-sidebar-content-push-to-mini-sidebar"
          aria-label="Toggle navigation"
          data-hs-overlay="#hs-sidebar-content-push-to-mini-sidebar"
        >
          Open
        </button>
      </div>

      {/* Sidebar */}
      <div
        id="hs-sidebar-content-push-to-mini-sidebar"
        className="hs-overlay [--auto-close:lg] hs-overlay-minified:w-13 lg:block lg:translate-x-0 lg:end-auto lg:bottom-0 w-64 hs-overlay-open:translate-x-0 -translate-x-full transition-all duration-300 transform h-full hidden overflow-x-hidden fixed top-0 start-0 bottom-0 z-60 bg-white border-e border-gray-200"
        role="dialog"
        tabIndex={-1}
        aria-label="Sidebar"
      >
        <div className="relative flex flex-col h-full max-h-full">
          {/* Header */}
          <header className="py-4 px-2 flex justify-between items-center gap-x-2">
            <a
              className="flex-none font-semibold text-xl text-black focus:outline-none focus:opacity-80 hs-overlay-minified:hidden"
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault();
                navigate('/dashboard');
              }}
              aria-label="Brand"
            >
              Woice AI
            </a>

            <div className="lg:hidden">
              {/* Close Button */}
              <button
                type="button"
                className="flex justify-center items-center gap-x-3 size-6 bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:bg-gray-100"
                data-hs-overlay="#hs-sidebar-content-push-to-mini-sidebar"
              >
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/>
                  <path d="m6 6 12 12"/>
                </svg>
                <span className="sr-only">Close</span>
              </button>
              {/* End Close Button */}
            </div>
            <div className="hidden lg:block">
              {/* Toggle Button */}
              <button
                type="button"
                className="flex justify-center items-center flex-none gap-x-3 size-9 text-sm text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:bg-gray-100"
                aria-haspopup="dialog"
                aria-expanded="false"
                aria-controls="hs-sidebar-content-push-to-mini-sidebar"
                aria-label="Minify navigation"
                data-hs-overlay-minifier="#hs-sidebar-content-push-to-mini-sidebar"
              >
                <svg className="hidden hs-overlay-minified:block shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M15 3v18"/>
                  <path d="m8 9 3 3-3 3"/>
                </svg>
                <svg className="hs-overlay-minified:hidden shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M15 3v18"/>
                  <path d="m10 15-3-3 3-3"/>
                </svg>
                <span className="sr-only">Navigation Toggle</span>
              </button>
              {/* End Toggle Button */}
            </div>
          </header>
          {/* End Header */}

          {/* Body */}
          <nav className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300">
            <div className="pb-0 px-2 w-full flex flex-col flex-wrap">
              <ul className="space-y-1">
                {menuOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = activeMenu === option.id;
                  
                  return (
                    <li key={option.id}>
                      <a
                        className={`min-h-[36px] w-full flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                          isActive
                            ? 'bg-gray-100 text-primary'
                            : 'text-gray-800'
                        }`}
                        href={option.path}
                        onClick={(e) => {
                          e.preventDefault();
                          handleMenuClick(option.id, option.path);
                        }}
                        data-hs-tooltip={option.label}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className="hs-overlay-minified:hidden">{option.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
          {/* End Body */}

          {/* Footer */}
          <div className="pt-6 mt-auto border-t border-gray-200 px-2 pb-4">
            <div className="space-y-1">
              {user && (
                <div className="min-h-[36px] flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 hs-overlay-minified:hidden">
                  <UserIcon size={16} className="shrink-0" />
                  <span className="truncate">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              )}
              {user && (
                <div className="hs-overlay-minified:block hidden">
                  <div className="min-h-[36px] flex items-center justify-center py-2 px-2.5">
                    <div data-hs-tooltip={`${user.firstName} ${user.lastName}`}>
                      <UserIcon size={16} className="text-gray-600" />
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="min-h-[36px] w-full flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                data-hs-tooltip="Logout"
              >
                <LogOut size={16} className="shrink-0" />
                <span className="hs-overlay-minified:hidden">Logout</span>
              </button>
            </div>
          </div>
          {/* End Footer */}
        </div>
      </div>
      {/* End Sidebar */}

      {/* Main Content */}
      <div className="w-full lg:ps-64 hs-overlay-minified:lg:ps-13 transition-all duration-300">
        <div className="sticky top-0 inset-x-0 z-50 bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-600 lg:hidden"
                  data-hs-overlay="#hs-sidebar-content-push-to-mini-sidebar"
                >
                  <span className="sr-only">Toggle sidebar</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
