import React from 'react';

interface PageHeaderProps {
  heading: string;
  subheading?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ heading, subheading, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {subheading && (
          <p className="text-muted-foreground">{subheading}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
} 