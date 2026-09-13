import React from 'react'

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-stone-200/80 rounded-2xl ${className}`} aria-hidden="true" />
)

export const BranchSkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Memuat outlet...">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonBox className="h-6 w-32" />
          <SkeletonBox className="h-5 w-16 rounded-full" />
        </div>
        <SkeletonBox className="h-4 w-full" />
        <SkeletonBox className="h-4 w-3/4" />
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <SkeletonBox className="h-4 w-20" />
          <SkeletonBox className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
)

export const MenuSkeletonGrid: React.FC = () => (
  <div className="space-y-6" aria-label="Memuat menu...">
    <div className="flex gap-3 overflow-x-auto pb-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonBox key={i} className="h-10 w-24 shrink-0 rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm flex gap-4">
          <SkeletonBox className="w-20 h-20 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-5 w-3/4" />
            <SkeletonBox className="h-3 w-full" />
            <SkeletonBox className="h-3 w-1/2" />
            <div className="pt-2 flex items-center justify-between">
              <SkeletonBox className="h-5 w-16" />
              <SkeletonBox className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const OrderTrackingSkeleton: React.FC = () => (
  <div className="space-y-6" aria-label="Memuat pesanan...">
    <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
      <SkeletonBox className="h-8 w-1/3" />
      <SkeletonBox className="h-4 w-1/2" />
      <div className="pt-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBox className="w-6 h-6 rounded-full shrink-0" />
            <SkeletonBox className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
    <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-3">
      <SkeletonBox className="h-6 w-36" />
      <SkeletonBox className="h-4 w-full" />
      <SkeletonBox className="h-4 w-full" />
      <SkeletonBox className="h-4 w-2/3" />
    </div>
  </div>
)

export const OrderSuccessSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-lg text-left space-y-4" aria-label="Memuat status...">
    <div className="flex items-center justify-between gap-3">
      <SkeletonBox className="h-6 w-36" />
      <SkeletonBox className="h-8 w-20 rounded-xl" />
    </div>
    <div className="space-y-3 py-2">
      <SkeletonBox className="h-4 w-full" />
      <SkeletonBox className="h-4 w-3/4" />
      <SkeletonBox className="h-4 w-5/6" />
    </div>
    <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
      <SkeletonBox className="h-6 w-24" />
      <SkeletonBox className="h-7 w-28" />
    </div>
  </div>
)
