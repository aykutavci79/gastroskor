'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { followRestaurant, getRestaurantFollowStatus, unfollowRestaurant } from '@/lib/api';

type SessionWithBackendToken = {
  backendAccessToken?: string | null;
};

type Props = {
  restaurantId: string | null;
  userEmail: string | null | undefined;
  compact?: boolean;
  detailHref?: string | null;
};

export function RestaurantFollowButton({
  restaurantId,
  userEmail,
  compact = false,
  detailHref,
}: Props) {
  const { data: session } = useSession();
  const backendToken = (session as SessionWithBackendToken | null)?.backendAccessToken ?? null;
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const email = userEmail?.trim().toLowerCase() || null;

  useEffect(() => {
    if (!email || !restaurantId) {
      setFollowing(false);
      setLoaded(true);
      return;
    }
    if (!backendToken) {
      setFollowing(false);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    getRestaurantFollowStatus(restaurantId)
      .then((status) => {
        if (!cancelled) {
          setFollowing(status.following);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFollowing(false);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, email, backendToken]);

  const toggle = useCallback(async () => {
    if (!email) {
      const returnUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
      window.location.href = `/auth/giris?callbackUrl=${encodeURIComponent(returnUrl)}`;
      return;
    }
    if (!restaurantId) return;
    setBusy(true);
    try {
      const status = following
        ? await unfollowRestaurant(restaurantId, email)
        : await followRestaurant(restaurantId, email);
      setFollowing(status.following);
    } finally {
      setBusy(false);
    }
  }, [email, following, restaurantId]);

  if (!restaurantId && !detailHref) return null;

  const cls = compact
    ? 'card-touch-target rounded-lg border px-3 text-xs font-bold'
    : 'inline-flex min-h-[44px] items-center rounded-xl border px-4 py-2 text-sm font-bold';

  if (!restaurantId && detailHref) {
    return (
      <Link
        href={detailHref}
        className={`${cls} border-accent bg-accent text-neutral-950 hover:bg-accent-hover`}
        onClick={(e) => e.stopPropagation()}>
        Takip et
      </Link>
    );
  }

  if (!loaded) {
    return <span className={`${cls} border-border text-content-muted`}>…</span>;
  }

  const label = !email ? 'Giriş yap' : following ? (compact ? 'Takipte' : 'Takipten çık') : 'Takip et';

  return (
    <button
      type="button"
      disabled={busy}
      className={
        following
          ? `${cls} border-border bg-transparent text-content hover:bg-surface-input`
          : `${cls} border-accent bg-accent text-neutral-950 hover:bg-accent-hover`
      }
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void toggle();
      }}>
      {busy ? '…' : label}
    </button>
  );
}
