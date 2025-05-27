import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Skeleton } from "@/app/components/shared/ui/skeleton"
import { useTranslations } from "next-intl"

type Product = {
  name: string
  count: number
}

type ProductPopularityProps = {
  products: Product[]
  period: { start: string; end: string }
  type: 'most' | 'least'
  isLoading?: boolean
}

export function ProductPopularity({ products, period, type, isLoading = false }: ProductPopularityProps) {
  const t = useTranslations('Dashboard')
  const title = type === 'most' 
    ? t('popularProducts.mostPopular') 
    : t('popularProducts.leastPopular')
  
  const periodText = `${period.start} - ${period.end}`

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{periodText}</p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">{t('popularProducts.noData')}</p>
        ) : (
          <ul className="space-y-2">
            {products.map((product, index) => (
              <li key={index} className="flex justify-between items-center border-b pb-2">
                <span className="font-medium truncate max-w-[70%]">{product.name}</span>
                <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                  {product.count} {t('popularProducts.itemsSold')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
} 