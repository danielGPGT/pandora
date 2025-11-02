/**
 * Rate Calendar View Component
 * 
 * Visualizes selling rates on a calendar/timeline view
 */

"use client"

import { useMemo, useState } from "react"
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isWithinInterval, isSameDay, addMonths, subMonths, startOfYear, endOfYear, getYear, getMonth } from "date-fns"
import type { SellingRateDetails } from "@/lib/data/products"
import { getRatesDateRange } from "@/lib/utils/selling-rates"
import { RATE_BASIS } from "@/lib/types/selling-rates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"

type RateCalendarViewProps = {
  rates: SellingRateDetails[]
  onRateClick?: (rate: SellingRateDetails) => void
}

export function RateCalendarView({ rates, onRateClick }: RateCalendarViewProps) {
  // Get date range from rates
  const dateRange = useMemo(() => getRatesDateRange(rates), [rates])
  
  // State for calendar navigation
  const [displayMonth, setDisplayMonth] = useState(() => dateRange.minDate || new Date())
  
  // Calculate month boundaries
  const monthStart = startOfMonth(displayMonth)
  const monthEnd = endOfMonth(displayMonth)
  
  // Get year range from rates (or default to ±5 years from current)
  const minYear = dateRange.minDate ? getYear(dateRange.minDate) : getYear(new Date()) - 5
  const maxYear = dateRange.maxDate ? getYear(dateRange.maxDate) : getYear(new Date()) + 5
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
  
  // Month names for selector
  const months = [
    { value: 0, label: "January" },
    { value: 1, label: "February" },
    { value: 2, label: "March" },
    { value: 3, label: "April" },
    { value: 4, label: "May" },
    { value: 5, label: "June" },
    { value: 6, label: "July" },
    { value: 7, label: "August" },
    { value: 8, label: "September" },
    { value: 9, label: "October" },
    { value: 10, label: "November" },
    { value: 11, label: "December" },
  ]
  
  // Navigation handlers
  const goToPreviousMonth = () => {
    setDisplayMonth(subMonths(displayMonth, 1))
  }
  
  const goToNextMonth = () => {
    setDisplayMonth(addMonths(displayMonth, 1))
  }
  
  const goToPreviousYear = () => {
    setDisplayMonth(subMonths(displayMonth, 12))
  }
  
  const goToNextYear = () => {
    setDisplayMonth(addMonths(displayMonth, 12))
  }
  
  const handleMonthChange = (monthValue: string) => {
    const month = parseInt(monthValue)
    setDisplayMonth(new Date(getYear(displayMonth), month, 1))
  }
  
  const handleYearChange = (yearValue: string) => {
    const year = parseInt(yearValue)
    setDisplayMonth(new Date(year, getMonth(displayMonth), 1))
  }
  
  // Reset to rates range if navigating outside
  const currentYear = getYear(displayMonth)
  const currentMonth = getMonth(displayMonth)
  
  // Get all days in the month
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Group rates by date and track span ranges
  const ratesByDate = useMemo(() => {
    const map = new Map<string, SellingRateDetails[]>()
    const spanRates = new Map<string, { rate: SellingRateDetails; isStart: boolean; isEnd: boolean; isMiddle: boolean }[]>()
    
    for (const rate of rates) {
      const rateStart = new Date(rate.valid_from)
      const rateEnd = new Date(rate.valid_to)
      
      // Determine if this is a daily-applicable rate
      const isDailyRate = 
        rate.rate_basis === RATE_BASIS.PER_NIGHT ||
        rate.rate_basis === RATE_BASIS.PER_PERSON || // Per person can be daily for tours
        rate.rate_basis === RATE_BASIS.PER_ITEM // Per item can be daily for activities
      
      // Check if rate spans multiple days
      const daysDiff = Math.ceil((rateEnd.getTime() - rateStart.getTime()) / (1000 * 60 * 60 * 24))
      const isMultiDay = daysDiff > 0
      
      if (isDailyRate || !isMultiDay) {
        // Daily rates: show on all days
        for (const day of days) {
          if (isWithinInterval(day, { start: rateStart, end: rateEnd })) {
            const dayKey = format(day, "yyyy-MM-dd")
            if (!map.has(dayKey)) {
              map.set(dayKey, [])
            }
            map.get(dayKey)!.push(rate)
          }
        }
      } else {
        // Multi-day non-daily rates: show on all days but mark start/middle/end
        for (const day of days) {
          if (isWithinInterval(day, { start: rateStart, end: rateEnd })) {
            const dayKey = format(day, "yyyy-MM-dd")
            const isStart = isSameDay(day, rateStart)
            const isEnd = isSameDay(day, rateEnd)
            const isMiddle = !isStart && !isEnd
            
            if (!spanRates.has(dayKey)) {
              spanRates.set(dayKey, [])
            }
            spanRates.get(dayKey)!.push({ rate, isStart, isEnd, isMiddle })
            
            // Also add to main map for display
            if (!map.has(dayKey)) {
              map.set(dayKey, [])
            }
            map.get(dayKey)!.push(rate)
          }
        }
      }
    }
    
    return { ratesByDate: map, spanRates }
  }, [rates, days])
  
  const ratesByDateMap = ratesByDate.ratesByDate
  const spanRates = ratesByDate.spanRates
  
  // Detect conflicts (multiple rates on same day for same option)
  const conflictsByDate = useMemo(() => {
    const map = new Map<string, number>()
    
    for (const [dateKey, dateRates] of ratesByDateMap.entries()) {
      // Count rates per option on this date
      const optionRates = new Map<string | null, number>()
      
      for (const rate of dateRates) {
        const optionId = rate.option_id
        optionRates.set(optionId, (optionRates.get(optionId) || 0) + 1)
      }
      
      // Find conflicts (multiple rates for same option)
      let conflictCount = 0
      for (const count of optionRates.values()) {
        if (count > 1) {
          conflictCount += count - 1 // Count overlapping rates
        }
      }
      
      if (conflictCount > 0) {
        map.set(dateKey, conflictCount)
      }
    }
    
    return map
  }, [ratesByDateMap])
  
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  
  // Get first day of week for the month
  const firstDayOfWeek = monthStart.getDay()
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Year navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousYear}
            className="h-8 w-8 p-0"
            title="Previous year"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          {/* Month navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
            className="h-8 w-8 p-0"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Month selector */}
          <Select
            value={currentMonth.toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-[140px] h-8 text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Year selector */}
          <Select
            value={currentYear.toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[90px] h-8 text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Month navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            className="h-8 w-8 p-0"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Year navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextYear}
            className="h-8 w-8 p-0"
            title="Next year"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-blue-500/20 border border-blue-500" />
            <span>Active rate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-yellow-500/20 border border-yellow-500" />
            <span>Conflict</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-purple-500/20 border border-purple-500" />
            <span>Multi-day rate</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
        
        {/* Empty cells for days before month start */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}
        
        {/* Calendar days */}
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd")
          const dayRates = ratesByDateMap.get(dayKey) || []
          const daySpanRates = spanRates.get(dayKey) || []
          const hasConflict = conflictsByDate.has(dayKey)
          const isToday = isSameDay(day, new Date())
          
          // Check if this day has any multi-day span rates
          const hasSpanRates = daySpanRates.length > 0
          
          return (
            <div
              key={dayKey}
              className={cn(
                "aspect-square border rounded-md p-1.5 flex flex-col gap-0.5 cursor-pointer hover:bg-muted/50 transition-colors relative",
                isToday && "ring-2 ring-blue-500",
                hasConflict && "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-500/50",
                // Multi-day span indicator: subtle background for middle days, borders for start/end
                hasSpanRates && daySpanRates.some(s => s.isMiddle) && "bg-purple-50/30 dark:bg-purple-950/10",
                hasSpanRates && daySpanRates.some(s => s.isStart) && "border-l-4 border-l-purple-500",
                hasSpanRates && daySpanRates.some(s => s.isEnd) && "border-r-4 border-r-purple-500"
              )}
              onClick={() => dayRates[0] && onRateClick?.(dayRates[0])}
            >
              {/* Span connection indicators */}
              {hasSpanRates && (
                <>
                  {daySpanRates.some(s => s.isStart) && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-400/50" />
                  )}
                  {daySpanRates.some(s => s.isMiddle) && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-400/30" />
                  )}
                  {daySpanRates.some(s => s.isEnd) && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-400/50" />
                  )}
                </>
              )}
              <span className={cn(
                "text-xs font-medium",
                isToday ? "text-blue-600 dark:text-blue-400" : "text-foreground"
              )}>
                {format(day, "d")}
              </span>
              
              {dayRates.length > 0 && (
                <div className="flex-1 overflow-hidden">
                  <div className="space-y-0.5">
                    {dayRates.slice(0, 2).map((rate, idx) => {
                      // Find span info for this rate
                      const spanInfo = daySpanRates.find(s => s.rate.id === rate.id)
                      const isSpanStart = spanInfo?.isStart ?? false
                      const isSpanEnd = spanInfo?.isEnd ?? false
                      const isSpanMiddle = spanInfo?.isMiddle ?? false
                      const isSpanRate = isSpanStart || isSpanEnd || isSpanMiddle
                      
                      // Format display based on rate basis and span position
                      const formatPrice = () => {
                        const price = `${rate.currency} ${rate.base_price.toFixed(0)}`
                        
                        switch (rate.rate_basis) {
                          case RATE_BASIS.PER_BOOKING:
                          case RATE_BASIS.FLAT_RATE:
                            // Only show "Total:" on start day, otherwise just show price or marker
                            if (isSpanStart) {
                              return `Total: ${price}`
                            } else if (isSpanMiddle) {
                              return "─" // Connection indicator
                            } else if (isSpanEnd) {
                              return `${price}` // End marker
                            }
                            return `Total: ${price}`
                          case RATE_BASIS.PER_PERSON:
                            return `${price}/person`
                          case RATE_BASIS.PER_ITEM:
                            return `${price}/item`
                          case RATE_BASIS.PER_NIGHT:
                          default:
                            return price
                        }
                      }
                      
                      const getRateBasisLabel = () => {
                        switch (rate.rate_basis) {
                          case RATE_BASIS.PER_NIGHT:
                            return "per night"
                          case RATE_BASIS.PER_PERSON:
                            return "per person"
                          case RATE_BASIS.PER_ITEM:
                            return "per item"
                          case RATE_BASIS.PER_BOOKING:
                            return "per booking"
                          case RATE_BASIS.FLAT_RATE:
                            return "flat rate"
                          default:
                            return rate.rate_basis
                        }
                      }
                      
                      return (
                        <div
                          key={rate.id}
                          className={cn(
                            "text-[10px] px-1 py-0.5 rounded truncate text-center",
                            rate.is_active
                              ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                              : "bg-muted text-muted-foreground",
                            // Span rate styling
                            isSpanRate && "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
                            isSpanMiddle && "bg-purple-400/10 text-purple-600 dark:text-purple-400 border-purple-400/20 border-dashed"
                          )}
                          title={`${rate.rate_name || "Untitled rate"}\n${rate.currency} ${rate.base_price.toFixed(2)} ${getRateBasisLabel()}\nValid: ${format(new Date(rate.valid_from), "MMM d")} - ${format(new Date(rate.valid_to), "MMM d")}${isSpanRate ? `\n${isSpanStart ? "Start" : isSpanEnd ? "End" : "Middle"} of multi-day rate` : ""}`}
                        >
                          {formatPrice()}
                        </div>
                      )
                    })}
                    {dayRates.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayRates.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {hasConflict && (
                <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">
                  ⚠️
                </span>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Legend and summary */}
      {rates.length > 0 && (
        <div className="pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>
              {rates.length} rate{rates.length !== 1 ? "s" : ""} total
            </span>
            {conflictsByDate.size > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400">
                ⚠️ {conflictsByDate.size} day{conflictsByDate.size !== 1 ? "s" : ""} with conflicts
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

