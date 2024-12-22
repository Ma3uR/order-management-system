import * as React from "react"
import { Trash, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/app/components/shared/ui/use-toast"

interface NotificationProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  type?: "success" | "error"
}

export function Notification({
  title,
  description,
  type = "success",
  className,
  ...props
}: NotificationProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-lg p-4",
        type === "error" ? "bg-destructive/15" : "bg-green-500/15",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "rounded-full p-1",
          type === "error" ? "bg-destructive" : "bg-green-500"
        )}
      >
        {type === "error" ? (
          <Trash className="h-4 w-4 text-white" />
        ) : (
          <Check className="h-4 w-4 text-white" />
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

export function useNotification() {
  const { toast } = useToast()

  const showNotification = React.useCallback(
    (props: NotificationProps) => {
      toast({
        duration: 4000,
        className: cn(
          "border-none p-0",
          props.type === "error" ? "bg-destructive/5" : "bg-green-500/5"
        ),
        description: <Notification {...props} />,
      })
    },
    [toast]
  )

  return { showNotification }
} 