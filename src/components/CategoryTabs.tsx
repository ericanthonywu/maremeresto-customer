import React from 'react'
import type { Category } from '../types'

interface CategoryTabsProps {
  categories: Category[]
  activeCategory: string
  onSelectCategory: (slug: string) => void
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <div className="sticky top-16 z-20 bg-stone-50/95 backdrop-blur-md py-3 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
              activeCategory === 'all'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Semua Menu
          </button>

          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.slug)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
