"use client";

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  Key,
  Webhook,
  BarChart3,
  Settings,
  FileCode,
  Zap,
  Menu,
  X
} from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const productsItems: NavItem[] = [
  { href: '/services', label: 'Services', icon: <Zap className="w-4 h-4" /> },
  { href: '/api-keys', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
  { href: '/webhooks', label: 'Webhooks', icon: <Webhook className="w-4 h-4" /> },
  { href: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
];

const resourcesItems: NavItem[] = [
  { href: '/logs', label: 'Logs', icon: <FileCode className="w-4 h-4" /> },
  { href: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50  backdrop-blur-sm ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 bg-[#0a0a0a] rounded-2xl lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3 group shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-black  to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:shadow-cyan-500/25 hover:scale-110">
                
              </div>
              <span className="hidden sm:inline font-bold font-sans text-lg text-cyan-200 group-hover:text-cyan-400 transition-colors duration-300">
                OneRouter
              </span>
            </Link>

             {/* Navigation Menu - Desktop */}
             <NavigationMenu className="hidden lg:flex flex-1 justify-start ml-8 font-sans" suppressHydrationWarning>
               <NavigationMenuList>
                 {/* Home Link */}
                 <NavigationMenuItem>
                   <Link href="/" className={navigationMenuTriggerStyle()}>
                     Home
                   </Link>
                 </NavigationMenuItem>

                 {/* Dashboard Link */}
                 <NavigationMenuItem>
                   <Link href="/dashboard" className={navigationMenuTriggerStyle()}>
                     Dashboard
                   </Link>
                 </NavigationMenuItem>

                 {/* Products Dropdown */}
                 <NavigationMenuItem>
                   <NavigationMenuTrigger className={navigationMenuTriggerStyle()}>
                     Products
                   </NavigationMenuTrigger>
                   <NavigationMenuContent>
                     <div className="grid gap-2 w-64">
                       {productsItems.map((item) => (
                         <Link
                           key={item.href}
                           href={item.href}
                           className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 group ${
                             pathname === item.href
                               ? 'bg-white/20 text-white'
                               : 'text-white hover:bg-white/20'
                           }`}
                         >
                           <div className="transition-all duration-300 text-cyan-500">
                             {item.icon}
                           </div>
                           <span className="font-medium">{item.label}</span>
                         </Link>
                       ))}
                     </div>
                   </NavigationMenuContent>
                 </NavigationMenuItem>

                 {/* Resources Dropdown */}
                 <NavigationMenuItem>
                   <NavigationMenuTrigger className={navigationMenuTriggerStyle()}>
                     Resources
                   </NavigationMenuTrigger>
                   <NavigationMenuContent>
                     <div className="grid gap-2 p-4 w-64">
                       {resourcesItems.map((item) => (
                         <Link
                           key={item.href}
                           href={item.href}
                           className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 group ${
                             pathname === item.href
                               ? 'bg-white/20 text-white'
                               : 'text-gray-50 hover:bg-white/20'
                           }`}
                         >
                           <div className="transition-all duration-300">
                             {item.icon}
                           </div>
                           <span className="font-medium">{item.label}</span>
                         </Link>
                       ))}
                     </div>
                   </NavigationMenuContent>
                 </NavigationMenuItem>

                 {/* Pricing */}
                 <NavigationMenuItem>
                   <button className={navigationMenuTriggerStyle()}>
                     Pricing
                   </button>
                 </NavigationMenuItem>

                 {/* Docs */}
                 <NavigationMenuItem>
                   <button className={navigationMenuTriggerStyle()}>
                     Docs
                   </button>
                 </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>

             {/* Mobile Menu Button */}
             <button
               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
               className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-all duration-300"
             >
               {mobileMenuOpen ? (
                 <X className="w-5 h-5" />
               ) : (
                 <Menu className="w-5 h-5" />
               )}
             </button>

             {/* User Menu */}
            <div className="flex items-center gap-4 ml-auto flex-shrink-0">
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/5 transition-all duration-300 group">
                <UserButton afterSignOutUrl="/" />
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-white group-hover:text-cyan-400 transition-colors duration-300">
                    Account
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 border-t border-white/10 mt-4">
              <div className="space-y-2">
                <Link href="/" className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all">
                  Home
                </Link>
                <Link href="/dashboard" className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all">
                  Dashboard
                </Link>
                <div className="px-4 py-2 text-sm font-medium text-cyan-400">Products</div>
                {productsItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-8 py-2 text-sm rounded-lg hover:bg-white/10 transition-all"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="px-4 py-2 text-sm font-medium text-cyan-400">Resources</div>
                {resourcesItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-8 py-2 text-sm rounded-lg hover:bg-white/10 transition-all"
                  >
                    {item.label}
                  </Link>
                ))}
                <button className="block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition-all">
                  Pricing
                </button>
                <button className="block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition-all">
                  Docs
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
