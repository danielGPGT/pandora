export function generateSupplierCode(name: string): string {
  return (
    name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 20) +
    "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  )
}


