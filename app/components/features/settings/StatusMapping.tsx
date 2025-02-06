"use client";

import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/shared/ui/select";
import { toast } from 'sonner';
import { StatusResponse } from "@/app/types/pocketbase-types";
import { getOrderStatuses as getPromuaStatuses } from "@/app/actions/prom-ua";
import { getOrderStatuses as getRozetkaStatuses } from "@/app/actions/rozetka";
import { getHardcodedStatuses } from "@/app/actions/epicentr";

interface MarketplaceStatus {
  id: string;
  code: string;
  name: string;
}

interface StatusMappingProps {
  appStatuses: StatusResponse[];
  onChange: (mappings: Record<string, string>) => void;
}

export function StatusMapping({ appStatuses, onChange }: StatusMappingProps) {
  const [activeMarketplace, setActiveMarketplace] = useState(0);
  const [marketplaceStatuses, setMarketplaceStatuses] = useState<MarketplaceStatus[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const marketplaces = [
    { name: "PromUa", color: "#3B82F6" },
    { name: "Rozetka", color: "#EF4444" },
    { name: "Epicentr", color: "#10B981" }
  ];

  useEffect(() => {
    const fetchStatuses = async () => {
      setIsLoading(true);
      try {
        let response;
        switch(activeMarketplace) {
          case 0:
            response = await getPromuaStatuses();
            console.log('response PROMUA', response);
            break;
          case 1:
            response = await getRozetkaStatuses();
            console.log('response ROZETKA', response);
            break;
          case 2:
            response = await getHardcodedStatuses();
            break;
          default:
            response = { data: [] };
        }

        if (response.error) throw new Error(response.error);
        
        const formattedStatuses = (response.data || []).map((status: { id: number | string, title: string; name?: string }) => {
          switch(activeMarketplace) {
            case 0: // PromUa
              return {
                code: status.id,
                name: status.title
              };
            case 1: // Rozetka
              return {
                code: status.id,
                name: status.title
              };
            case 2: // Epicentr
              return {
                code: status.id,
                name: status.title
              };
            default:
              return status;
          }
        });
        
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

  const handleMappingChange = (marketplaceStatusId: string, appStatusId: string) => {
    const newMappings = { ...mappings, [marketplaceStatusId]: appStatusId };
    setMappings(newMappings);
    onChange(newMappings);
  };

  return (
    <div className="border-2 rounded-[32px] p-6 shadow-md w-full max-w-4xl bg-background">
      <div className="rounded-full relative w-full bg-muted p-1.5 flex items-center mb-6">
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

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">Loading statuses...</div>
        ) : marketplaceStatuses.length === 0 ? (
          <div className="text-center py-4">No statuses available</div>
        ) : (
          marketplaceStatuses.map((status, index) => (
            <div 
              key={`${marketplaces[activeMarketplace].name}-${status.id || index}`}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: marketplaces[activeMarketplace].color }}
                />
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {marketplaces[activeMarketplace].name} Status
                  </span>
                  <span className="font-medium">{status.name}</span>
                </div>
              </div>
              
              <Select
                value={mappings[status.id] || ""}
                onValueChange={(value) => handleMappingChange(status.id, value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Map to app status" />
                </SelectTrigger>
                <SelectContent>
                  {appStatuses.map((appStatus) => (
                    <SelectItem key={appStatus.id} value={appStatus.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: appStatus.color }}
                        />
                        {appStatus.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))
        )}
      </div>
    </div>
  );
}