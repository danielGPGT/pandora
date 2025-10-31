"use client"

import { useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Star, X } from "lucide-react"

const BUCKET = "product_images"
const MAX_IMAGES = 5

export function ProductImageUploader({
  value = [],
  onChange,
}: {
  value?: string[]
  onChange: (urls: string[]) => void
}) {
  const [isUploading, setIsUploading] = useState(false)
  const primaryImage = value[0] ?? null

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files?.length) return

    const remainingSlots = MAX_IMAGES - value.length
    if (remainingSlots <= 0) {
      toast.warning(`You can upload up to ${MAX_IMAGES} images`)
      event.target.value = ""
      return
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    if (filesToUpload.length < files.length) {
      toast.warning(`Only the first ${filesToUpload.length} file${filesToUpload.length === 1 ? "" : "s"} will be uploaded (limit ${MAX_IMAGES})`)
    }

    console.info("[ProductImageUploader] Starting upload", { count: files.length })
    console.info("[ProductImageUploader] Supabase config", {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      bucket: BUCKET,
    })
    setIsUploading(true)
    const supabase = createClient()

    const uploads: string[] = []

    try {
      for (const file of filesToUpload) {
        console.info("[ProductImageUploader] Uploading file", {
          name: file.name,
          size: file.size,
          type: file.type,
        })
        const ext = file.name.split(".").pop()
        const filename = `${crypto.randomUUID()}.${ext}`
        try {
          console.info("[ProductImageUploader] Calling upload", { filename })
          const uploadPromise = supabase.storage.from(BUCKET).upload(filename, file, {
            cacheControl: "3600",
            upsert: false,
          })
          console.info("[ProductImageUploader] Awaiting upload", uploadPromise)
          const response = await uploadPromise
          console.info("[ProductImageUploader] Upload response", response)
          const { error, data } = response
          if (error) {
            console.error("[ProductImageUploader] Upload error", { file: file.name, error })
            toast.error(`Failed to upload ${file.name}`)
            continue
          }
          const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl
          console.info("[ProductImageUploader] Upload success", { file: file.name, publicUrl })
          uploads.push(publicUrl)
        } catch (uploadError) {
          console.error("[ProductImageUploader] Unexpected upload exception", uploadError)
          toast.error(`Failed to upload ${file.name}`)
        }
      }

      if (uploads.length) {
        onChange([...(value ?? []), ...uploads])
        toast.success(`${uploads.length} image${uploads.length > 1 ? "s" : ""} uploaded`)
      } else {
        console.info("[ProductImageUploader] No uploads completed")
      }
    } finally {
      setIsUploading(false)
      console.info("[ProductImageUploader] Upload flow finished")
      event.target.value = ""
    }
  }

  function handleSetPrimary(url: string) {
    if (!value.includes(url)) return
    onChange([url, ...value.filter((item) => item !== url)])
    toast.success("Primary image updated")
  }

  async function handleRemove(url: string) {
    onChange(value.filter((item) => item !== url))
    const supabase = createClient()
    const path = extractPath(url)
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) {
      toast.error("Failed to delete image")
      console.error("[ProductImageUploader] Delete error", { url, error })
    } else {
      console.info("[ProductImageUploader] Deleted image", { url })
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
        <Input
          type="file"
          accept="image/*"
          multiple
          disabled={isUploading || value.length >= MAX_IMAGES}
          className="hidden"
          onChange={handleFileChange}
        />
        <span>
          {isUploading
            ? "Uploading..."
            : value.length >= MAX_IMAGES
            ? `Maximum of ${MAX_IMAGES} images reached`
            : "Click or drag to upload images"}
        </span>
        <span className="text-xs">Supported types: JPG, PNG, WEBP. Up to {MAX_IMAGES} images per product.</span>
      </label>

      {value.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {value.map((url) => (
            <figure key={url} className="relative overflow-hidden rounded-lg border bg-muted/30">
              <Image src={url} alt="Product image" width={400} height={320} className="h-48 w-full object-cover" />
              {url === primaryImage ? (
                <Badge className="absolute left-2 top-2 border border-primary/60 bg-primary text-primary-foreground shadow-sm">
                  Primary
                </Badge>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="absolute left-2 top-2 h-7 gap-1 border border-primary/60 bg-primary/90 text-primary-foreground hover:bg-primary"
                  onClick={() => handleSetPrimary(url)}
                >
                  <Star className="h-3 w-3" />
                  Set primary
                </Button>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-linear-to-t from-black/70 to-transparent p-2 text-xs text-white">
                <Badge variant="secondary" className="bg-black/50 text-white">{cleanFilename(url)}</Badge>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={() => handleRemove(url)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </figure>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">No images uploaded yet.</div>
      )}
    </div>
  )
}

function extractPath(url: string) {
  try {
    const parsed = new URL(url)
    const [, , , , path] = parsed.pathname.split("/")
    return path ?? url
  } catch {
    return url
  }
}

function cleanFilename(url: string) {
  try {
    const decoded = decodeURIComponent(url)
    return decoded.split("/").pop()?.split("?")[0] ?? url
  } catch {
    return url
  }
}


