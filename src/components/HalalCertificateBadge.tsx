import React from 'react'

interface HalalCertificateBadgeProps {
  certificateId?: string
  compact?: boolean
}

/** The supplied halal logo with the certificate identifier for each outlet. */
export const HalalCertificateBadge: React.FC<HalalCertificateBadgeProps> = ({ certificateId, compact = false }) => {
  const id = certificateId?.trim()

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-left text-emerald-950 ${
        compact ? 'max-w-full' : ''
      }`}
      aria-label={id ? `Bersertifikat halal, ID ${id}` : 'Bersertifikat halal'}
    >
      <img
        src="/mui-halal.jpeg"
        alt=""
        className="h-9 w-9 shrink-0 rounded-lg border border-emerald-100 bg-white object-contain p-0.5"
      />
      <span className="min-w-0 leading-tight">
        <span className="block text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">Bersertifikat halal</span>
        {id && <span className="block truncate text-[10px] font-semibold text-emerald-700">ID: {id}</span>}
      </span>
    </div>
  )
}
