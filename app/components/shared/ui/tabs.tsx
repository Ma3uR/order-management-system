import React, { createContext, useContext, useState } from 'react';
import { cn } from "@/app/lib/utils"

const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
} | undefined>(undefined);

export function Tabs({ children, defaultValue, className }: { children: React.ReactNode; defaultValue: string; className?: string }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "flex border-b dark:border-gray-700",
      className
    )}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { activeTab, setActiveTab } = context;

  return (
    <button
      className={cn(
        "px-4 py-2 transition-colors",
        activeTab === value 
          ? "border-b-2 border-primary text-primary dark:border-primary dark:text-primary-foreground" 
          : "text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200",
        className
      )}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const { activeTab } = context;

  if (activeTab !== value) return null;

  return (
    <div className={cn("mt-4", className)}>
      {children}
    </div>
  );
}
