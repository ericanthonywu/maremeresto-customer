import React from 'react'

interface HalalCertificateBadgeProps {
  certificateId?: string
  compact?: boolean
}

/** A static halal mark with the certificate identifier supplied by each outlet. */
export const HalalCertificateBadge: React.FC<HalalCertificateBadgeProps> = ({ certificateId, compact = false }) => {
  const id = certificateId?.trim()

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-left text-emerald-950 ${
        compact ? 'max-w-full' : ''
      }`}
      aria-label={id ? `Bersertifikat halal, ID ${id}` : 'Bersertifikat halal'}
    >
      <img src="/halal-certificate.svg" alt="" className="h-8 w-8 shrink-0" />
      <span className="min-w-0 leading-tight">
        <span className="block text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">Bersertifikat halal</span>
        {id && <span className="block truncate text-[10px] font-semibold text-emerald-700">ID: {id}</span>}
      </span>
    </div>
  )
}
