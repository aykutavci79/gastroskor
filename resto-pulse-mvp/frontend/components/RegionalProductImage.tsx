import Image from 'next/image';

import { regionalProductImageSrc } from '@/lib/regional-product-image';

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

/** GastroSkor yoresel urun gorselleri — yerel /public veya cozulmus tam URL. */
export function RegionalProductImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 384px',
}: Props) {
  return (
    <Image
      src={regionalProductImageSrc(src)}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
      referrerPolicy="no-referrer"
    />
  );
}
