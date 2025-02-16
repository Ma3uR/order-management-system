import { OrdersRecord } from "../types/pocketbase-types"
import { OrdersResponse } from "../types/pocketbase-types"

export type OrderConflict = {
  field: keyof OrdersRecord
  values: string[]
}

export function detectConflicts(orders: OrdersResponse[]): OrderConflict[] {
  const conflicts: OrderConflict[] = []
  const fieldsToCheck: (keyof OrdersResponse)[] = [
    'phoneNumber', 
    'fullName',
    'deliveryMethod',
    'paymentMethod',
    'deliveryPostNumber',
    'notes'
  ]

  for (const field of fieldsToCheck) {
    const uniqueValues = Array.from(new Set(
      orders.map(o => o[field]?.toString() || '')
    )).filter(v => v !== '')
    
    if (uniqueValues.length > 1) {
      conflicts.push({
        field: field as keyof OrdersRecord,
        values: uniqueValues
      })
    }
  }
  
  return conflicts
} 