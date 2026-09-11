import React from 'react'

interface DriverProfileCardProps {
  driverName?: string
  driverPhone?: string
  driverVehicle?: string
  driverPlate?: string
  driverRating?: number
}

export const DriverProfileCard: React.FC<DriverProfileCardProps> = ({
  driverName = 'Andi Pratama',
  driverPhone = '+6281234567890',
  driverVehicle = 'Honda Vario 160 Hitam',
  driverPlate = 'B 1234 ABC',
  driverRating = 4.95,
}) => {
  return (
    <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-brand-700 flex items-center justify-center text-xl font-bold border border-amber-200">
            <i className="fa-solid fa-helmet-safety"></i>
          </div>
          <div>
            <h4 className="font-bold text-stone-900 text-sm">{driverName}</h4>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <i className="fa-solid fa-star text-[10px]"></i> {driverRating}
              </span>
              <span>•</span>
              <span>{driverVehicle}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="bg-stone-100 text-stone-800 font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg border border-stone-200 block">
            {driverPlate}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
        <a
          href={`https://wa.me/${driverPhone.replace('+', '')}?text=Halo%20Mas%20${encodeURIComponent(driverName)},%20saya%20pemesan%20dari%20Cafe%20Olga.`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
        >
          <i className="fa-brands fa-whatsapp text-sm"></i>
          <span>Chat WhatsApp</span>
        </a>

        <a
          href={`tel:${driverPhone}`}
          className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
        >
          <i className="fa-solid fa-phone text-xs"></i>
          <span>Telepon Kurir</span>
        </a>
      </div>
    </div>
  )
}
