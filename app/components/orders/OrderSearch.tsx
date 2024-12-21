import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Search } from 'lucide-react';

interface OrderSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function OrderSearch({ value, onChange, placeholder }: OrderSearchProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-background"
          onClick={() => onChange("")}
        >
          ×
        </Button>
      )}
    </div>
  );
} 