import { useEffect, useRef, useState } from "react";

import { CprGuide } from "@/services/audio/cprGuide";
import { CprFallback } from "@/services/audio/fallback";
import { Metronome } from "@/services/audio/metronome";
import type { Symptom } from "@/types/api";

type UseCprGuideOptions = {
  sessionId: string;
  symptom: Symptom;
};

type UseCprGuideResult = {
  isFallback: boolean;
  status: "idle" | "connecting" | "ready" | "fallback";
};

export function useCprGuide(
  active: boolean,
  options: UseCprGuideOptions
): UseCprGuideResult {
  const { sessionId, symptom } = options;
  const guideRef = useRef<CprGuide | null>(null);
  const fallbackRef = useRef<CprFallback | null>(null);
  const metronomeRef = useRef<Metronome | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [status, setStatus] = useState<UseCprGuideResult["status"]>("idle");

  if (!guideRef.current) {
    guideRef.current = new CprGuide();
  }

  if (!fallbackRef.current) {
    fallbackRef.current = new CprFallback();
  }

  if (!metronomeRef.current) {
    metronomeRef.current = new Metronome();
  }

  useEffect(() => {
    const guide = guideRef.current as CprGuide;
    const fallback = fallbackRef.current as CprFallback;
    const metronome = metronomeRef.current as Metronome;

    if (!active) {
      setIsFallback(false);
      setStatus("idle");
      void Promise.all([guide.stop(), fallback.stop(), metronome.stop()]);
      return;
    }

    let cancelled = false;
    let fallbackTriggered = false;

    setIsFallback(false);
    setStatus("connecting");

    const unsubscribeFallback = guide.onFallback(() => {
      fallbackTriggered = true;

      if (cancelled) {
        return;
      }

      setIsFallback(true);
      setStatus("fallback");
      void fallback.play();
    });

    void (async () => {
      try {
        await Promise.all([
          metronome.start({ bpm: 100 }),
          guide.start({ sessionId, symptom }),
        ]);

        if (!cancelled && !fallbackTriggered) {
          setStatus("ready");
        }
      } catch {
        if (!cancelled && !fallbackTriggered) {
          setIsFallback(true);
          setStatus("fallback");
          void fallback.play();
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeFallback();
      void Promise.all([guide.stop(), fallback.stop(), metronome.stop()]);
    };
  }, [active, sessionId, symptom]);

  return { isFallback, status };
}
