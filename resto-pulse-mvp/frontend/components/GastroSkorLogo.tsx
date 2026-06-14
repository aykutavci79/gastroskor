'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type Props = {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

export function GastroSkorLogo({ className, width = 56, height = 56, priority = false }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const src = mounted && resolvedTheme === 'light' ? '/logo-light.png' : '/logo.png';

  return (
    <Image
      src={src}
      alt="GastroSkor"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
