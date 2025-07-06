import { SidebarProvider } from '@/app/components/shared/ui/sidebar';
import { AppSidebar } from '@/app/components/layouts/AppSidebar';
import { ProtectedRoute } from '@/app/components/auth/ProtectedRoute';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
