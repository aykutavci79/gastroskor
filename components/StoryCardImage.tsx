"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
};

export default function StoryCardImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);

  const finalSrc = !src || failed ? "/images/story-placeholder.svg" : src;

  return (
    <Image
      src={finalSrc}
      alt={alt}
      fill
      className={className ?? "object-cover"}
      onError={() => setFailed(true)}
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  );
}