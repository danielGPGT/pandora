"use server"

import { getProductsPage, getProductDetails } from "@/lib/data/products"
import type { ProductsQuery } from "@/lib/data/products"

export async function searchProducts(query: ProductsQuery) {
  try {
    return await getProductsPage(query)
  } catch (error) {
    console.error("Search products error:", error)
    throw error
  }
}

export async function fetchProductDetailsForQuote(productId: string) {
  try {
    return await getProductDetails(productId)
  } catch (error) {
    console.error("Fetch product details error:", error)
    throw error
  }
}

