import { StatusOptionsResponse } from '@/app/types/pocketbase-types';
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

export interface FilterOptions {
  status: string
  dateRange: { from: null | Date, to: null | Date }
  minAmount?: number
  maxAmount?: number
}

interface OrderFiltersProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  statuses: StatusOptionsResponse[]
  maxAmount: number
  translations: {
    filters: string
    status: string
    selectStatus: string
    all: string
    amountRange: string
    resetFilters: string
    dateRange: string
    selectDateRange: string
  }
  translateStatus: (status: string) => string
}

export function OrderFilters({
  filters,
  onFiltersChange,
  statuses,
  maxAmount,
  translations,
  translateStatus
}: OrderFiltersProps) {
  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value
    });
  };

  const handleAmountRangeChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      minAmount: value[0],
      maxAmount: value[1]
    });
  };

  const handleDateRangeChange = (from: Date | null, to: Date | null) => {
    onFiltersChange({
      ...filters,
      dateRange: { from, to }
    });
  };

  const handleResetFilters = () => {
    onFiltersChange({
      status: '',
      dateRange: { from: null, to: null },
      minAmount: undefined,
      maxAmount: undefined
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium">{translations.status}</Label>
        <Select
          value={filters.status}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={translations.selectStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{translations.all}</SelectItem>
            {statuses.map(status => (
              <SelectItem 
                key={status.id} 
                value={status.id}
                style={{
                  backgroundColor: status.color,
                  color: UtilityService.getContrastColor(status.color)
                }}
              >
                {translateStatus(status.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{translations.amountRange}</Label>
          <div className="text-xs text-muted-foreground flex justify-between">
            <span>{UtilityService.formatCurrency(filters.minAmount || 0)}</span>
            <span>{UtilityService.formatCurrency(filters.maxAmount || maxAmount)}</span>
          </div>
        </div>
        <Slider
          min={0}
          max={maxAmount}
          step={100}
          value={[filters.minAmount || 0, filters.maxAmount || maxAmount]}
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
                  !filters.dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                      {format(filters.dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(filters.dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>{translations.selectDateRange}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={filters.dateRange.from || undefined}
                selected={{
                  from: filters.dateRange.from || undefined,
                  to: filters.dateRange.to || undefined,
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

      <Button 
        variant="outline" 
        onClick={handleResetFilters}
        className="w-full"
        size="sm"
      >
        {translations.resetFilters}
      </Button>
    </div>
  );
} 