import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  DollarSign,
  LogOut,
  Settings,
  Link2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { CompanySettings, Theme } from '@/types';
import { useSharedAccess } from '@/context/SharedAccessContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";

type MainLayoutProps = {
  children: React.ReactNode;
};

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { open } = useSidebar();
  const { isSharedMode, permissions: sharedPermissions, token } = useSharedAccess();
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      module: 'dashboard',
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Leads',
      href: '/leads',
      icon: Users,
      module: 'leads',
      current: location.pathname === '/leads'
    },
    {
      name: 'Conversas',
      href: '/conversations',
      icon: MessageSquare,
      module: 'conversations',
      current: location.pathname === '/conversations'
    },
    {
      name: 'Links de rastreamento',
      href: '/campaigns',
      icon: Link2,
      module: 'campaigns',
      current: location.pathname === '/campaigns'
    },
    {
      name: 'Vendas',
      href: '/sales',
      icon: DollarSign,
      module: 'sales',
      current: location.pathname === '/sales'
    },
    {
      name: 'Configurações',
      href: '/settings',
      icon: Settings,
      module: 'settings',
      current: location.pathname === '/settings'
    },
  ];

  useEffect(() => {
    if (!isSharedMode) {
      loadCompanySettings();
    }
  }, [isSharedMode]);

  const loadCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading company settings:', error);
      } else if (data) {
        const typedData: CompanySettings = {
          ...data,
          theme: (data.theme as Theme) || 'system'
        };
        setCompanySettings(typedData);
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const getNavLinkHref = (href: string) => {
    if (isSharedMode && token) {
      return `/shared/${token}${href}`;
    }
    return href;
  };

  const checkPermission = (module: string) => {
    if (!isSharedMode) return true;
    return sharedPermissions?.[module]?.view === true;
  };

  const getUserDisplayName = () => {
    return user?.email || 'Usuário';
  };

  const getUserInitial = () => {
    const email = user?.email;
    return email ? email.charAt(0).toUpperCase() : 'U';
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-gradient-to-b from-card to-background">
      <SidebarHeader className="border-b border-border/30">
        <div className={cn(
          "flex items-center gap-3 px-3 py-4",
          !open && "justify-center"
        )}>
          <div className="flex-shrink-0">
            {isLoadingSettings && !isSharedMode ? (
              <div className="h-10 w-10 rounded-xl bg-muted animate-pulse ring-2 ring-primary/20" />
            ) : (
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-xl opacity-50 group-hover:opacity-100 blur transition duration-300" />
                <img
                  src={companySettings?.logo_url || "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&h=150&q=80"}
                  alt="Logo"
                  className="relative h-10 w-10 rounded-xl object-cover ring-1 ring-border"
                />
              </div>
            )}
          </div>
          {open && (
            <div className="flex flex-col min-w-0">
              {isLoadingSettings && !isSharedMode ? (
                <>
                  <div className="h-5 w-20 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </>
              ) : (
                <>
                  <span className="font-bold text-base text-foreground truncate">
                    {companySettings?.company_name || "Sua Empresa"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {companySettings?.company_subtitle || "Sistema de Marketing"}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map((item) => (
                checkPermission(item.module) && (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.href}
                      className={cn(
                        "relative rounded-lg transition-all duration-200",
                        location.pathname === item.href 
                          ? "bg-primary/10 text-primary font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r-full before:bg-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <NavLink to={getNavLinkHref(item.href)}>
                        <item.icon className={cn(
                          "h-4 w-4 transition-colors",
                          location.pathname === item.href && "text-primary"
                        )} />
                        <span>{item.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!isSharedMode && (
        <SidebarFooter className="border-t border-border/30 p-3">
          <SidebarMenu className="space-y-2">
            <SidebarMenuItem>
              <div className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/30",
                !open && "justify-center"
              )}>
                <div className="relative">
                  <div className="flex-shrink-0 h-9 w-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-lg">
                    {getUserInitial()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-card" />
                </div>
                {open && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                )}
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={logout}
                className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-md px-4 lg:px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
          </header>
          
          <div className="container mx-auto py-6 px-4 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
