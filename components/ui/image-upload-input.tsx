"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, UploadCloud } from "lucide-react"

type ImageUploadInputProps = {
  value?: string | null
  onChange: (file: File | null, previewUrl: string | null) => void
  description?: string
  className?: string
  disabled?: boolean
}

export function ImageUploadInput({ value, onChange, description, className, disabled }: ImageUploadInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (value && value.startsWith("blob:")) {
        URL.revokeObjectURL(value)
      }
    }
  }, [value])

  const handleSelectFile = () => {
    inputRef.current?.click()
  }

  const handleRemove = () => {
    if (inputRef.current) {
      inputRef.current.value = ""
    }
    onChange(null, null)
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          const url = URL.createObjectURL(file)
          onChange(file, url)
          event.target.value = ""
        }}
      />

      {value ? (
        <div className="relative">
          <Image
            src={value}
            alt="Event image"
            width={600}
            height={360}
            className="h-48 w-full rounded-lg object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute right-3 top-3"
            onClick={handleRemove}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Remove
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full gap-2" onClick={handleSelectFile} disabled={disabled}>
          <UploadCloud className="h-4 w-4" /> Upload image
        </Button>
      )}

      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  )
}



