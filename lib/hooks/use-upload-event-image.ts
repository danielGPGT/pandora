"use client"

import { useCallback, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function useUploadEventImage() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (eventId: string, file: File): Promise<string | null> => {
    setIsUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop()
      const path = `events/${eventId}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from("product_images").upload(path, file, {
        upsert: true,
        cacheControl: "3600",
      })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("product_images").getPublicUrl(path)
      return data.publicUrl
    } catch (err) {
      console.error("useUploadEventImage error", err)
      setError(err instanceof Error ? err.message : "Failed to upload image")
      return null
    } finally {
      setIsUploading(false)
    }
  }, [])

  return { upload, isUploading, error }
}


