"use client";

import { useEffect } from "react";

type Props = {
  storySlug: string;
  language?: string;
  storyId?: string | number;
};

export default function StoryViewTracker({ storySlug, language, storyId }: Props) {
  useEffect(() => {
    const w = window as any;

    // GA4 gtag.js kuyruğu: gtag hazır değilse bile event kaybolmasın
    w.dataLayer = w.dataLayer || [];
    w.gtag =
      w.gtag ||
      function () {
        // gtag.js beklediği format: dataLayer.push(arguments)
        w.dataLayer.push(arguments);
      };

    const params: Record<string, any> = { story_slug: storySlug };
    if (language) params.language = language;
    if (storyId !== undefined) params.story_id = String(storyId);

    w.gtag("event", "story_view", params);
  }, [storySlug, language, storyId]);

  return null;
}
