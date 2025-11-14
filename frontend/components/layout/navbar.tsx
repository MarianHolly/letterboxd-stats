"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
}

const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const analyticsLink = { label: "Analytics", href: "/analytics" };

export default function NavBar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Don't show navbar on analytics page
  if (pathname.startsWith("/analytics")) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-xl border-b border-white/0 dark:border-slate-800/0">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-center h-12">
          {/* Desktop Navigation (centered) */}
          <div className="hidden md:flex items-center justify-center">
            <div className="flex gap-2 items-center">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? "bg-white/20 dark:bg-white/10 text-slate-900 dark:text-white backdrop-blur-md"
                      : "text-slate-700 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Separator */}
              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

              {/* Analytics Link */}
              <Link
                href={analyticsLink.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive(analyticsLink.href)
                    ? "bg-white/20 dark:bg-white/10 text-slate-900 dark:text-white backdrop-blur-md"
                    : "text-slate-700 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {analyticsLink.label}
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden absolute right-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? "bg-white/20 dark:bg-white/10 text-slate-900 dark:text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Separator */}
              <div className="my-2 h-px bg-slate-300 dark:bg-slate-600" />

              {/* Analytics Link */}
              <Link
                href={analyticsLink.href}
                className={`block px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive(analyticsLink.href)
                    ? "bg-white/20 dark:bg-white/10 text-slate-900 dark:text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {analyticsLink.label}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
