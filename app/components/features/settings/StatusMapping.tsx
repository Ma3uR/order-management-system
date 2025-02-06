"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from 'sonner';
import { StatusResponse } from "@/app/types/pocketbase-types";
import { getOrderStatuses as getPromuaStatuses } from "@/app/actions/prom-ua";
import { getOrderStatuses as getRozetkaStatuses } from "@/app/actions/rozetka";
import { getHardcodedStatuses } from "@/app/actions/epicentr";
import { cn } from "@/app/lib/utils";
import { Check, Search } from "lucide-react";
import { Input } from "@/app/components/shared/ui/input";

interface MarketplaceStatus {
  code: string;
  name: string;
}

interface StatusMappingProps {
  currentStatus: StatusResponse;
  onChange: (mappings: Record<string, string>) => void;
}

export function StatusMapping({ currentStatus, onChange }: StatusMappingProps) {
  const [activeMarketplace, setActiveMarketplace] = useState(0);
  const [marketplaceStatuses, setMarketplaceStatuses] = useState<MarketplaceStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mappings, setMappings] = useState<Record<string, string>>({
    epicentr: currentStatus.epicentrCode || '',
    rozetka: currentStatus.rozetkaCode || '',
    promua: currentStatus.promuaCode || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const marketplaces = [
    { name: "PromUa", color: "#3B82F6", key: 'promua' },
    { name: "Rozetka", color: "#EF4444", key: 'rozetka' },
    { name: "Epicentr", color: "#10B981", key: 'epicentr' }
  ];

  // Filter statuses based on search query
  const filteredStatuses = useMemo(() => {
    if (!searchQuery.trim()) return marketplaceStatuses;
    
    return marketplaceStatuses.filter(status => 
      status.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [marketplaceStatuses, searchQuery]);

  useEffect(() => {
    const fetchStatuses = async () => {
      setIsLoading(true);
      try {
        let response;
        switch(activeMarketplace) {
          case 0:
            response = await getPromuaStatuses();
            break;
          case 1:
            response = await getRozetkaStatuses();
            break;
          case 2:
            response = await getHardcodedStatuses();
            break;
          default:
            response = { data: [] };
        }

        if (response.error) throw new Error(response.error);
        
        const formattedStatuses = (response.data || []).map((status: { id: number | string, title: string; name?: string }) => ({
          code: status.id.toString(),
          name: status.title || status.name || ''
        }));
        
        setMarketplaceStatuses(formattedStatuses);
      } catch (error) {
        toast.error('Failed to fetch statuses', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatuses();
  }, [activeMarketplace]);

  const handleStatusSelect = (statusId: string) => {
    const newMappings = { ...mappings };
    newMappings[marketplaces[activeMarketplace].key] = statusId;
    setMappings(newMappings);
    onChange(newMappings);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-full relative w-full bg-muted p-1.5 flex items-center">
        {marketplaces.map((marketplace, index) => (
          <button
            key={marketplace.name}
            className="font-semibold rounded-full w-full p-2 text-foreground z-20 transition-all"
            onClick={() => setActiveMarketplace(index)}
            style={{
              color: activeMarketplace === index ? 'white' : 'inherit',
              fontWeight: activeMarketplace === index ? 600 : 400
            }}
          >
            {marketplace.name}
          </button>
        ))}
        <div
          className="p-1.5 absolute inset-0 w-1/3 z-10"
          style={{
            transform: `translateX(${activeMarketplace * 100}%)`,
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div 
            className="bg-accent rounded-full w-full h-full shadow-sm"
            style={{
              backgroundColor: marketplaces[activeMarketplace].color,
              opacity: 0.9
            }}
          />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search statuses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{marketplaces[activeMarketplace].name} Statuses</h3>
          {mappings[marketplaces[activeMarketplace].key] && (
            <div className="text-sm text-muted-foreground">
              (Currently mapped: {
                marketplaceStatuses.find(s => s.code === mappings[marketplaces[activeMarketplace].key])?.name || 'Unknown'
              })
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 min-h-[300px]">
        {isLoading ? (
          <div className="text-center py-4">Loading statuses...</div>
        ) : filteredStatuses.length === 0 ? (
          <div className="text-center py-4">
            {marketplaceStatuses.length === 0 ? 'No statuses available' : 'No matching statuses found'}
          </div>
        ) : (
          filteredStatuses.map((status) => {
            const isSelected = mappings[marketplaces[activeMarketplace].key] === status.code;
            
            return (
              <button
                key={status.code}
                onClick={() => handleStatusSelect(status.code)}
                className={cn(
                  "flex items-center justify-between w-full p-4 rounded-lg transition-colors",
                  "hover:bg-muted/80",
                  isSelected && "bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: marketplaces[activeMarketplace].color }}
                  />
                  <span className="font-medium">{status.name}</span>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}