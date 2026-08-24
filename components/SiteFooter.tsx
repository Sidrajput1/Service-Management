'use client';

import Link from 'next/link';
import { Zap, Mail, MapPin, Phone } from 'lucide-react';

const footerSections = [
  {
    title: 'Platform',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Demo', href: '/demo' },
    ],
  },
  {
    title: 'For Customers',
    links: [
      { label: 'Find a service', href: '/signup' },
      { label: 'Sign up', href: '/signup' },
      { label: 'Sign in', href: '/signin' },
    ],
  },
  {
    title: 'For Providers',
    links: [
      { label: 'Register your business', href: '/signup' },
      { label: 'Provider login', href: '/signin' },
      { label: '30-day free trial', href: '/#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/' },
      { label: 'Contact', href: '/#contact' },
      { label: 'Privacy', href: '/' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-linear-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/30">
                <Zap className="h-5 w-5" fill="currentColor" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                Servi<span className="text-brand-coral">zato</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              The infrastructure and marketplace for service businesses. Customers find
              trusted professionals, providers manage their operations.
            </p>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-brand-teal" />
                <span>hello@servizato.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-brand-teal" />
                <span>+91 6201274925</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-brand-teal" />
                <span>Noida, UP, India</span>
              </div>
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-brand-coral"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Servfast. All rights reserved.
          </p>
          {/* <p className="text-sm text-muted-foreground">
            Built with care for service businesses.
          </p> */}
        </div>
      </div>
    </footer>
  );
}
