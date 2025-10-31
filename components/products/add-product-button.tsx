"use client"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AddProductButton() {
  const router = useRouter()

  const handleClick = () => {
    router.push("/products/new")
  }

  return (
    <Button className="gap-2" onClick={handleClick}>
      <Plus className="h-4 w-4" /> New product
    </Button>
  )
}


