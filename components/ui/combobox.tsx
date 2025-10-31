"use client"

import * as React from "react"
import { Check, ChevronsUpDown, XCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ComboboxOption = {
  value: string
  label: string
  description?: string
}

type ComboboxProps = {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null, option?: ComboboxOption) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  clearable?: boolean
  disabled?: boolean
  id?: string
  className?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  clearable = false,
  disabled = false,
  id,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  )

  const handleSelect = React.useCallback(
    (selectedValue: string) => {
      if (selectedValue === value) {
        onChange(null)
      } else {
        const option = options.find((item) => item.value === selectedValue)
        onChange(selectedValue, option)
      }
      setOpen(false)
    },
    [onChange, options, value]
  )

  const handleClear = React.useCallback(() => {
    onChange(null)
    setOpen(false)
  }, [onChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {clearable && selectedOption ? (
              <CommandGroup heading="Selection">
                <CommandItem
                  value="__clear__"
                  onSelect={handleClear}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear selection
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                  className="flex flex-col items-start gap-1"
                >
                  <div className="flex w-full items-center">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate font-medium">{option.label}</span>
                  </div>
                  {option.description ? (
                    <span className="ml-6 text-xs text-muted-foreground">{option.description}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

