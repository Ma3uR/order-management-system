import { StatusOptionsResponse } from '@/app/types/pocketbase-types';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { Label } from "@/app/components/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select";
import { Button } from "@/app/components/shared/ui/button";
import { Slider } from "@/app/components/shared/ui/slider";
import { UtilityService } from '@/app/services/utilityService';

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

  const handleAmountRangeChange = ([min, max]: number[]) => {
    onFiltersChange({
      ...filters,
      minAmount: min,
      maxAmount: max
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
    <Card className="bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {translations.filters}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">{translations.status}</Label>
          <Select
            value={filters.status}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-full bg-background/60">
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

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs font-medium">{translations.amountRange}</Label>
            <span className="text-xs text-muted-foreground">
              {UtilityService.formatCurrency(filters.minAmount || 0)} - {UtilityService.formatCurrency(filters.maxAmount || maxAmount)}
            </span>
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

        <Button 
          variant="ghost" 
          onClick={handleResetFilters}
          className="w-full text-xs hover:bg-accent hover:text-accent-foreground dark:border-border"
        >
          {translations.resetFilters}
        </Button>
      </CardContent>
    </Card>
  );
} 