"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 68;
const MAX_PULL = 112;

export function usePullToRefresh(onRefresh?: () => void | Promise<void>) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const tracking = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  const reset = useCallback(() => {
    tracking.current = false;
    pullRef.current = 0;
    setPull(0);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onRefresh) return;

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || el.scrollTop > 2) return;
      startY.current = event.touches[0]?.clientY ?? 0;
      tracking.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking.current || refreshingRef.current) return;

      const y = event.touches[0]?.clientY ?? 0;
      const delta = y - startY.current;

      if (delta <= 0 || el.scrollTop > 2) {
        if (pullRef.current > 0) reset();
        return;
      }

      event.preventDefault();
      const next = Math.min(delta * 0.5, MAX_PULL);
      pullRef.current = next;
      setPull(next);
    };

    const finish = () => {
      if (!tracking.current) return;
      tracking.current = false;

      if (pullRef.current >= THRESHOLD && !refreshingRef.current) {
        setRefreshing(true);
        setPull(THRESHOLD);
        void Promise.resolve(onRefresh())
          .catch(() => undefined)
          .finally(() => {
            setRefreshing(false);
            reset();
          });
        return;
      }

      reset();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", finish);
    el.addEventListener("touchcancel", finish);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", finish);
      el.removeEventListener("touchcancel", finish);
    };
  }, [onRefresh, reset]);

  const offset = refreshing ? THRESHOLD : pull;
  const progress = Math.min(1, offset / THRESHOLD);

  return {
    scrollRef,
    pull: offset,
    progress,
    refreshing,
    active: offset > 0 || refreshing,
  };
}
