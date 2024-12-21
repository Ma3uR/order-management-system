import { useState } from 'react'
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover"

interface Status {
  id: string
  name: string
  color: string
}

interface StatusSelectProps {
  status: Status | undefined
  statuses: Status[]
  onStatusChange: (statusId: string) => Promise<void>
  translateStatus: (status: string) => string
  getContrastColor: (color: string) => string
}

export function StatusSelect({ 
  status, 
  statuses, 
  onStatusChange, 
  translateStatus,
  getContrastColor 
}: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="p-0 h-auto">
          <Badge
            style={{
              backgroundColor: status?.color?.startsWith('#') 
                ? status.color 
                : '#cbd5e1',
              color: getContrastColor(status?.color || '#cbd5e1'),
              padding: '0.5rem 0.75rem',
              cursor: 'pointer'
            }}
          >
            {status ? translateStatus(status.name) : ''}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <div className="grid gap-1 p-1">
          {statuses.map(statusOption => (
            <Button
              key={statusOption.id}
              variant="ghost"
              className="w-full justify-start"
              style={{
                backgroundColor: statusOption.color,
                color: getContrastColor(statusOption.color)
              }}
              onClick={async () => {
                await onStatusChange(statusOption.id)
                setIsOpen(false)
              }}
            >
              {translateStatus(statusOption.name)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
} 