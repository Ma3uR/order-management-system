import { cn } from "@/app/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      className={cn(
        "animate-spin rounded-full border-2",
        "border-background border-t-foreground",
        {
          'h-4 w-4 border-2': size === 'sm',
          'h-6 w-6 border-2': size === 'md',
          'h-8 w-8 border-3': size === 'lg',
        },
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
} 