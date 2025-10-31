'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { type DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  label?: string;
  placeholder?: string;
  value?: DateRange | undefined;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function DateRangePicker({
  label,
  placeholder = 'Pick a date range',
  value,
  onChange,
  className,
  disabled = false,
  required = false,
  id
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [tempRange, setTempRange] = useState<DateRange | undefined>(value)

  // Sync tempRange with value when it changes externally
  useEffect(() => {
    setTempRange(value)
  }, [value])

  const handleSelect = (range: DateRange | undefined) => {
    setTempRange(range)
    onChange?.(range)
    // Keep popover open - user can close manually by clicking outside or pressing Escape
  }

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return placeholder
    
    if (range.from && range.to) {
      return `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
    }
    
    if (range.from) {
      return `${range.from.toLocaleDateString()} - ...`
    }
    
    return placeholder
  }

  return (
    <div className={cn('w-full space-y-2', className)}>
      {label && (
        <Label htmlFor={id} className="px-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            id={id} 
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {formatDateRange(value)}
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            disabled={disabled}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default DateRangePicker