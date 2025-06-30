'use client';

import DashboardLayout from '../dashboard/layout';

export default function FiscalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}