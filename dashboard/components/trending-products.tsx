"use client"

interface Props { data: { name: string; category: string; price: number; views: number; uniqueViewers: number }[] | undefined; isLoading: boolean; queryMs?: number }

export function TrendingProducts({ data, isLoading, queryMs }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Trending Products (5 min)</h2>
        {queryMs != null && <span className="text-[10px] text-green-400 font-medium">{queryMs}ms</span>}
      </div>
      {isLoading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-[var(--muted)] rounded animate-pulse" />)}</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[var(--muted-foreground)] border-b border-[var(--border)]"><th className="text-left py-2 font-medium">#</th><th className="text-left py-2 font-medium">Product</th><th className="text-left py-2 font-medium">Category</th><th className="text-right py-2 font-medium">Price</th><th className="text-right py-2 font-medium">Views</th></tr></thead>
            <tbody>{data?.map((p, i) => (<tr key={p.name} className="border-b border-[var(--border)]/50"><td className="py-2 text-[var(--muted-foreground)]">{i + 1}</td><td className="py-2 font-medium">{p.name}</td><td className="py-2 text-[var(--muted-foreground)]">{p.category}</td><td className="py-2 text-right">${p.price.toFixed(2)}</td><td className="py-2 text-right font-medium">{p.views}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
