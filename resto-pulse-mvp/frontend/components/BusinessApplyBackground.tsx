import Image from 'next/image';

type Figure = {
  src: string;
  alt: string;
  quote: string;
  className: string;
  bubbleClassName: string;
  width: number;
  height: number;
  priority?: boolean;
};

const FIGURES: Figure[] = [
  {
    src: '/images/business-apply/business-apply-owner-chef.png',
    alt: 'Beyaz önlüklü restoran sahibi el sıkışıyor',
    quote: 'Teşekkürler!',
    className: 'left-[-8%] top-[1%] w-[34%] max-w-[190px] sm:left-[-1%] sm:top-[0%] sm:w-[22%] sm:max-w-[220px] lg:w-[20%] lg:max-w-[240px]',
    bubbleClassName: 'left-[56%] top-[0%] sm:left-[60%]',
    width: 240,
    height: 320,
    priority: true,
  },
  {
    src: '/images/business-apply/business-apply-owner-casual.png',
    alt: 'Sade giyimli restoran işletmecisi el sıkışıyor',
    quote: 'Hoşbuldum!',
    className: 'right-[-10%] top-[8%] w-[36%] max-w-[200px] sm:right-[-2%] sm:top-[4%] sm:w-[24%] sm:max-w-[230px] lg:w-[21%] lg:max-w-[250px]',
    bubbleClassName: 'right-[54%] top-[2%] sm:right-[58%]',
    width: 250,
    height: 330,
    priority: true,
  },
  {
    src: '/images/business-apply/business-apply-owner-kebabci.png',
    alt: 'Kebapçı restoran sahibi el sıkışıyor',
    quote: 'Anlaştık!',
    className: 'left-[-6%] top-[28%] w-[32%] max-w-[180px] sm:left-[0%] sm:top-[26%] sm:w-[20%] sm:max-w-[210px] lg:w-[18%] lg:max-w-[230px]',
    bubbleClassName: 'left-[52%] top-[4%]',
    width: 230,
    height: 310,
  },
  {
    src: '/images/business-apply/business-apply-owner-cafe-hijab.png',
    alt: 'Kafe işletmecisi el sıkışıyor',
    quote: 'Memnunuz!',
    className: 'right-[-8%] top-[32%] w-[34%] max-w-[190px] sm:right-[0%] sm:top-[30%] sm:w-[21%] sm:max-w-[215px] lg:w-[19%] lg:max-w-[235px]',
    bubbleClassName: 'right-[50%] top-[3%] sm:right-[55%]',
    width: 235,
    height: 315,
  },
  {
    src: '/images/business-apply/business-apply-owner-balikci.png',
    alt: 'Balık restoranı sahibi el sıkışıyor',
    quote: 'Memnun oldum!',
    className: 'left-[-5%] top-[52%] w-[30%] max-w-[170px] sm:left-[1%] sm:top-[50%] sm:w-[19%] sm:max-w-[200px] lg:w-[17%] lg:max-w-[220px]',
    bubbleClassName: 'left-[54%] top-[2%]',
    width: 220,
    height: 300,
  },
  {
    src: '/images/business-apply/business-apply-owner-izgara.png',
    alt: 'Izgara restoranı sahibi el sıkışıyor',
    quote: 'Tamamdır!',
    className: 'right-[-7%] top-[54%] w-[32%] max-w-[185px] sm:right-[1%] sm:top-[52%] sm:w-[20%] sm:max-w-[205px] lg:w-[18%] lg:max-w-[225px]',
    bubbleClassName: 'right-[52%] top-[4%]',
    width: 225,
    height: 305,
  },
  {
    src: '/images/business-apply/business-apply-owner-woman.png',
    alt: 'Önlüklü restoran sahibi el sıkışıyor',
    quote: 'Hayırlı olsun!',
    className: 'left-[-4%] bottom-[8%] w-[33%] max-w-[185px] sm:left-[2%] sm:bottom-[6%] sm:w-[21%] sm:max-w-[215px] lg:w-[19%] lg:max-w-[235px]',
    bubbleClassName: 'left-[55%] top-[5%]',
    width: 235,
    height: 310,
  },
  {
    src: '/images/business-apply/business-apply-owner-pastane.png',
    alt: 'Pastane işletmecisi el sıkışıyor',
    quote: 'Teşekkür ederiz!',
    className: 'right-[-6%] bottom-[14%] w-[31%] max-w-[175px] sm:right-[2%] sm:bottom-[10%] sm:w-[19%] sm:max-w-[200px] lg:w-[17%] lg:max-w-[215px]',
    bubbleClassName: 'right-[48%] top-[3%]',
    width: 215,
    height: 295,
  },
  {
    src: '/images/business-apply/business-apply-owner-lokanta.png',
    alt: 'Lokanta işletmecisi el sıkışıyor',
    quote: 'Güzel oldu!',
    className: 'left-[-3%] bottom-[24%] hidden w-[28%] max-w-[160px] sm:block sm:left-[3%] sm:bottom-[22%] sm:w-[17%] sm:max-w-[185px] lg:w-[16%] lg:max-w-[200px]',
    bubbleClassName: 'left-[50%] top-[2%]',
    width: 200,
    height: 280,
  },
  {
    src: '/images/business-apply/business-apply-owner-teyze.png',
    alt: 'Yöresel restoran işletmecisi el sıkışıyor',
    quote: 'Bereketli olsun!',
    className: 'right-[-4%] bottom-[28%] hidden w-[29%] max-w-[165px] sm:block sm:right-[3%] sm:bottom-[26%] sm:w-[18%] sm:max-w-[190px] lg:w-[16%] lg:max-w-[205px]',
    bubbleClassName: 'right-[46%] top-[3%]',
    width: 205,
    height: 285,
  },
];

function SpeechBubble({ quote, className }: { quote: string; className: string }) {
  return (
    <div
      className={`absolute z-20 whitespace-nowrap rounded-2xl border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-800 shadow-md sm:px-3 sm:py-1.5 sm:text-sm ${className}`}
      aria-hidden>
      {quote}
      <span className="absolute -bottom-1.5 left-3 h-2.5 w-2.5 rotate-45 border-b border-r border-amber-200 bg-white sm:left-4 sm:h-3 sm:w-3" />
    </div>
  );
}

export function BusinessApplyBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-white" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_50%_45%,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.72)_42%,rgba(255,255,255,0.28)_100%)]" />

      {FIGURES.map((figure) => (
        <div key={figure.src} className={`absolute opacity-55 sm:opacity-60 lg:opacity-[0.62] ${figure.className}`}>
          <div className="relative">
            <SpeechBubble quote={figure.quote} className={figure.bubbleClassName} />
            <Image
              src={figure.src}
              alt={figure.alt}
              width={figure.width}
              height={figure.height}
              className="h-auto w-full select-none"
              priority={figure.priority}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
