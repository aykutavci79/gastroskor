import Image from 'next/image';

type Figure = {
  src: string;
  alt: string;
  quote: string;
  className: string;
  bubbleClassName: string;
  width: number;
  height: number;
};

const FIGURES: Figure[] = [
  {
    src: '/images/business-apply/business-apply-owner-chef.png',
    alt: 'Beyaz önlüklü restoran sahibi el sıkışıyor',
    quote: 'Teşekkürler!',
    className: 'left-[-4%] top-[8%] w-[38%] max-w-[220px] sm:left-[2%] sm:top-[6%] sm:w-[28%] sm:max-w-[260px]',
    bubbleClassName: 'left-[58%] top-[2%] sm:left-[62%] sm:top-[0%]',
    width: 260,
    height: 340,
  },
  {
    src: '/images/business-apply/business-apply-owner-casual.png',
    alt: 'Sade giyimli restoran işletmecisi el sıkışıyor',
    quote: 'Hoşbuldum!',
    className: 'right-[-6%] top-[22%] w-[40%] max-w-[230px] sm:right-[1%] sm:top-[18%] sm:w-[30%] sm:max-w-[270px]',
    bubbleClassName: 'right-[52%] top-[4%] sm:right-[58%] sm:top-[2%]',
    width: 270,
    height: 350,
  },
  {
    src: '/images/business-apply/business-apply-owner-woman.png',
    alt: 'Önlüklü restoran sahibi el sıkışıyor',
    quote: 'Hayırlı olsun!',
    className: 'left-[-2%] bottom-[6%] w-[36%] max-w-[210px] sm:left-[4%] sm:bottom-[8%] sm:w-[26%] sm:max-w-[250px]',
    bubbleClassName: 'left-[55%] top-[6%] sm:left-[60%] sm:top-[4%]',
    width: 250,
    height: 330,
  },
];

function SpeechBubble({ quote, className }: { quote: string; className: string }) {
  return (
    <div
      className={`absolute z-20 whitespace-nowrap rounded-2xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-md sm:text-sm ${className}`}
      aria-hidden>
      {quote}
      <span className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 border-b border-r border-amber-200 bg-white" />
    </div>
  );
}

export function BusinessApplyBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-white" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.75)_45%,rgba(255,255,255,0.55)_100%)]" />

      {FIGURES.map((figure) => (
        <div key={figure.src} className={`absolute opacity-50 sm:opacity-60 lg:opacity-55 ${figure.className}`}>
          <div className="relative">
            <SpeechBubble quote={figure.quote} className={figure.bubbleClassName} />
            <Image
              src={figure.src}
              alt={figure.alt}
              width={figure.width}
              height={figure.height}
              className="h-auto w-full select-none"
              priority
            />
          </div>
        </div>
      ))}
    </div>
  );
}
