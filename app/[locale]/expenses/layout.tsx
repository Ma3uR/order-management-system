'use client';

import DashboardLayout from '../dashboard/layout';

export default function ExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
