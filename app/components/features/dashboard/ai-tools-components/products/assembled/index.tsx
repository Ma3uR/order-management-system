import { ProductsBeingAssembled } from "./products-being-assembled"

type Product = {
  name: string
  quantity: number
}

type ProductsToolProps = {
  products: Product[]
  ordersCount: number
  isLoading?: boolean
}

export function ProductsTool({ products, ordersCount, isLoading = false }: ProductsToolProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-3">
      <ProductsBeingAssembled 
        products={products} 
        ordersCount={ordersCount} 
        isLoading={isLoading} 
      />
    </div>
  )
} 