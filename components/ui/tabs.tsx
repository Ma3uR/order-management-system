import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
} | undefined>(undefined);

/**
 * Renders a tabs component with context for managing active tab state.
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.children - The content to be rendered within the tabs component.
 * @param {string} props.defaultValue - The initial active tab value.
 * @returns {JSX.Element} A div containing the children wrapped in a TabsContext.Provider.
 */
export function Tabs({ children, defaultValue }: { children: React.ReactNode; defaultValue: string }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
}

/**
 * Renders a container for tab list items with a bottom border.
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.children - The child elements to be rendered inside the tab list container.
 * @returns {JSX.Element} A div element with flex layout and bottom border, containing the provided children.
 */
export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="flex border-b">{children}</div>;
}

/**
 * Renders a trigger button for a tab in a tabs component
 * @param {Object} props - The component props
 * @param {string} props.value - The value associated with this tab trigger
 * @param {React.ReactNode} props.children - The content to be rendered inside the trigger button
 * @returns {JSX.Element} A button element styled based on whether it's the active tab
 * @throws {Error} Throws an error if used outside of a Tabs component
 */
export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { activeTab, setActiveTab } = context;

  return (
    <button
      className={`px-4 py-2 ${
        activeTab === value ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'
      }`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

/**
 * Renders the content of a tab based on the active tab value.
 * @param {Object} props - The component props.
 * @param {string} props.value - The value of the tab content to be rendered.
 * @param {React.ReactNode} props.children - The content to be rendered when the tab is active.
 * @returns {React.ReactNode|null} The tab content if the tab is active, otherwise null.
 * @throws {Error} Throws an error if used outside of a Tabs component.
 */
export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const { activeTab } = context;

  if (activeTab !== value) return null;

  return <div className="mt-4">{children}</div>;
}
