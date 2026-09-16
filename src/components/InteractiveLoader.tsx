import React, { useState, useEffect } from 'react'

const CULINARY_TIPS = [
  'Soto & hidangan Mareme diracik dengan bumbu rempah autentik khas Solo yang selalu disajikan hangat.',
  'Tips Solo: Nikmati hidangan hangat paling pas dengan perasan jeruk nipis dan tempe goreng renyah!',
  'Di Mareme Group, setiap porsi dimasak dengan bahan segar setiap hari agar kualitas rasa selalu terjaga.',
  'Pesan online lebih praktis: ongkir dihitung otomatis dari cabang terdekat ke rumah Anda.',
  'Bapak/Ibu bisa menulis catatan khusus untuk dapur pada setiap menu yang dipesan!',
]

const STIR_SEASONINGS = [
  '+1 Sendok Sambal Pedas 🌶️',
  '+1 Taburan Bawang Goreng 🧅',
  '+1 Perasan Jeruk Nipis 🍋',
  '+1 Kaldu Gurih Mantap ♨️',
  '+1 Suwir Ayam Empuk 🍗',
  '+1 Kerupuk Renyah 🥢',
  'Aroma Sedap Semerbak! ✨',
]

interface InteractiveLoaderProps {
  message?: string
}

export const InteractiveLoader: React.FC<InteractiveLoaderProps> = ({
  message = 'Menyiapkan hidangan hangat untukmu...',
}) => {
  const [stirCount, setStirCount] = useState(0)
  const [activeBubble, setActiveBubble] = useState<string | null>(null)
  const [isWobbling, setIsWobbling] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)

  // Auto rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % CULINARY_TIPS.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [])

  const handleStir = () => {
    // Haptic feedback if available
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25)
      }
    } catch {
      // Ignore vibration error
    }

    setStirCount((c) => c + 1)
    setIsWobbling(true)
    setTimeout(() => setIsWobbling(false), 500)

    const randomSeasoning =
      STIR_SEASONINGS[Math.floor(Math.random() * STIR_SEASONINGS.length)]
    setActiveBubble(randomSeasoning)
    setTimeout(() => setActiveBubble(null), 1200)
  }

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % CULINARY_TIPS.length)
  }

  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center animate-fade-in select-none">
      {/* Steaming Bowl Illustration / Animation */}
      <div className="relative mb-6 cursor-pointer group" onClick={handleStir}>
        {/* Animated Steam Puffs */}
        <div className="flex justify-center gap-3 mb-1">
          <span className="inline-block w-1.5 h-6 bg-brand-400/60 rounded-full animate-pulse blur-[0.5px]" style={{ animationDuration: '1.2s' }} />
          <span className="inline-block w-1.5 h-8 bg-brand-500/70 rounded-full animate-pulse blur-[0.5px]" style={{ animationDuration: '1.6s', animationDelay: '0.3s' }} />
          <span className="inline-block w-1.5 h-6 bg-brand-400/60 rounded-full animate-pulse blur-[0.5px]" style={{ animationDuration: '1.4s', animationDelay: '0.6s' }} />
        </div>

        {/* Floating Bubble Pill when tapped */}
        {activeBubble && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-900 text-amber-100 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-lg border border-amber-600 animate-bounce whitespace-nowrap z-20">
            {activeBubble}
          </div>
        )}

        {/* The Bowl */}
        <div
          className={`w-28 h-28 rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white flex items-center justify-center text-5xl shadow-xl shadow-brand-500/25 border-4 border-white transition-transform ${
            isWobbling ? 'scale-105 rotate-3' : 'group-hover:scale-105'
          }`}
        >
          <i className="fa-solid fa-bowl-food" />
        </div>

        {/* Shadow under bowl */}
        <div className="w-20 h-2.5 bg-stone-300/60 rounded-full mx-auto mt-2 blur-xs" />
      </div>

      {/* Main Status */}
      <div className="space-y-1.5 mb-5">
        <h3 className="font-serif font-bold text-lg text-stone-900 leading-snug">
          {message}
        </h3>
        <p className="text-xs text-stone-500">
          Dapur kami sedang menyiapkan data pesanan & sajian hangat.
        </p>
      </div>

      {/* Interactive Stir Button & Counter */}
      <div className="mb-6 w-full max-w-xs">
        <button
          type="button"
          onClick={handleStir}
          className="w-full py-2.5 px-4 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 rounded-2xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-utensils text-brand-600" />
          <span>Sambil Nunggu, Tap untuk Aduk Soto! 🍲</span>
        </button>

        {stirCount > 0 && (
          <p className="mt-2 text-[11px] font-semibold text-brand-700 animate-fade-in">
            Sudah diaduk <span className="font-bold font-mono text-xs">{stirCount}x</span>!{' '}
            {stirCount >= 10 ? '✨ Wah, kuahnya sudah harum dan siap saji!' : 'Bumbu semakin meresap sedap.'}
          </p>
        )}
      </div>

      {/* Interactive Trivia Box */}
      <div className="w-full bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs text-left space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
            <i className="fa-regular fa-lightbulb text-amber-600" />
            Tahukah Kamu?
          </span>
          <button
            type="button"
            onClick={handleNextTip}
            className="text-[10px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-0.5"
          >
            <span>Fakta lain</span>
            <i className="fa-solid fa-chevron-right text-[8px]" />
          </button>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed min-h-[38px] transition-all">
          {CULINARY_TIPS[tipIndex]}
        </p>
      </div>
    </div>
  )
}
