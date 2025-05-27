import { ProductPopularity } from "./product-popularity"

type Product = {
  name: string
  count: number
}

type PopularityToolProps = {
  products: Product[]
  period: { start: string; end: string }
  type: 'most' | 'least'
  isLoading?: boolean
}

export function PopularityTool({ products, period, type, isLoading = false }: PopularityToolProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-3">
      <ProductPopularity 
        products={products} 
        period={period}
        type={type}
        isLoading={isLoading} 
      />
    </div>
  )
}
