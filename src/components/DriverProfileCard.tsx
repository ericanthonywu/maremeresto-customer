import React from 'react'

interface DriverProfileCardProps {
  driverName?: string
  driverPhone?: string
  driverVehicle?: string
  driverPlate?: string
}

/**
 * Courier details for an order. Every field comes from the order record — the
 * component has no defaults, because the previous placeholders ("Andi Pratama",
 * "B 1234 ABC", a phone number nobody owns) were shown to every customer as if
 * they were real.
 */
export const DriverProfileCard: React.FC<DriverProfileCardProps> = ({
  driverName,
  driverPhone,
  driverVehicle,
  driverPlate,
}) => {
  // Nothing useful to show without at least a name.
  if (!driverName) return null

  const waNumber = driverPhone?.replace(/\D/g, '')

  return (
    <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-md space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-2xl bg-amber-100 text-brand-700 flex items-center justify-center text-xl border border-amber-200 shrink-0"
            aria-hidden="true"
          >
            <i className="fa-solid fa-helmet-safety"></i>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Kurir Anda
            </span>
            <h4 className="font-bold text-stone-900 text-sm truncate">{driverName}</h4>
            {driverVehicle && <p className="text-xs text-stone-500 truncate">{driverVehicle}</p>}
          </div>
        </div>

        {driverPlate && (
          <span className="bg-stone-100 text-stone-800 font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg border border-stone-200 shrink-0">
            {driverPlate}
          </span>
        )}
      </div>

      {driverPhone && waNumber && (
        <div className="pt-3 border-t border-stone-100">
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <i className="fa-brands fa-whatsapp text-sm" aria-hidden="true"></i>
            <span>WhatsApp</span>
          </a>

        </div>
      )}
    </div>
  )
}
