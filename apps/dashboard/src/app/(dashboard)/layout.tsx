'use client';

import { BizraNavbar, BizraMobileNav, GridBackground } from '@/components/brand';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GridBackground />
      <BizraNavbar />
      {children}
      <BizraMobileNav />
    </>
  );
}
