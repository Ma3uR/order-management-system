import { Label } from "@/app/components/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select";
import { Button } from "@/app/components/shared/ui/button";
import { Slider } from "@/app/components/shared/ui/slider";
import { UtilityService } from '@/app/services/utilityService';
import { Calendar } from "@/app/components/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/shared/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/app/lib/utils";
import { OrdersMergeStatusOptions } from "@/app/types/pocketbase-types";

export interface FilterOptions {
  status?: string
  mergeStatus?: OrdersMergeStatusOptions
  dateRange?: {
    from: Date | null
    to: Date | null
  }
  amountRange?: {
    min: number
    max: number
  }
  archived?: boolean;
}

interface OrderFiltersProps {
  filters: FilterOptions
  onFilterChange: (filters: FilterOptions) => void
  onReset: () => void
  translations: {
    filters: string
    status: string
    selectStatus: string
    all: string
    amountRange: string
    resetFilters: string
    dateRange: string
    selectDateRange: string
    mergeStatus: string
    selectMergeStatus: string
  }
  statuses: Array<{ id: string; name: string }>
  onToggleArchived: () => void
}

export function OrderFilters({
  filters,
  onFilterChange,
  onReset,
  translations,
  statuses,
  onToggleArchived,
}: OrderFiltersProps) {
  const handleAmountRangeChange = (value: number[]) => {
    onFilterChange({
      ...filters,
      amountRange: {
        min: value[0],
        max: value[1]
      }
    });
  };

  const handleDateRangeChange = (from: Date | null, to: Date | null) => {
    onFilterChange({
      ...filters,
      dateRange: { from, to }
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{translations.filters}</h3>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            value={filters.status || ""}
            onValueChange={(value) =>
              onFilterChange({ ...filters, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={translations.selectStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{translations.all}</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.mergeStatus || ""}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                mergeStatus: value as OrdersMergeStatusOptions,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={translations.selectMergeStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{translations.all}</SelectItem>
              {Object.values(OrdersMergeStatusOptions).map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{translations.amountRange}</Label>
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{UtilityService.formatCurrency(filters.amountRange?.min || 0)}</span>
              <span>{UtilityService.formatCurrency(filters.amountRange?.max || 0)}</span>
            </div>
          </div>
          <Slider
            min={0}
            max={0}
            step={100}
            value={[filters.amountRange?.min || 0, filters.amountRange?.max || 0]}
            onValueChange={handleAmountRangeChange}
            className="mt-2"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">{translations.dateRange}</Label>
          <div className="grid gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.from && filters.dateRange?.to ? (
                    <>
                      {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                      {format(filters.dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    <span>{translations.selectDateRange}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange?.from || undefined}
                  selected={{
                    from: filters.dateRange?.from || undefined,
                    to: filters.dateRange?.to || undefined,
                  }}
                  onSelect={(range) => {
                    handleDateRangeChange(
                      range?.from || null,
                      range?.to || null
                    );
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button variant="outline" onClick={onReset}>
          {translations.resetFilters}
        </Button>

        <Button 
          variant="outline" 
          onClick={onToggleArchived}
          className="w-full"
        >
          {filters.archived ? "Show Active Orders" : "Show Archived Orders"}
        </Button>
      </div>
    </div>
  );
} 