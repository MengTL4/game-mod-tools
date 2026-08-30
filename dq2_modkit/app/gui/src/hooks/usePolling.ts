import { useEffect, useRef, useState } from "react";
import { readState, readEvents } from "../lib/bridge";
import type { GameEvent, GameState } from "../types";

export function usePolling(interval = 700) {
  const [state, setState] = useState<GameState | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const lastEventSizeRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    function tick() {
      if (!mounted) return;
      const nextState = readState();
      setState(nextState);

      try {
        const fs = require("fs");
        const { eventPath } = require("../lib/bridge");
        const size = fs.existsSync(eventPath) ? fs.statSync(eventPath).size : 0;
        if (size !== lastEventSizeRef.current) {
          lastEventSizeRef.current = size;
          setEvents(readEvents());
        }
      } catch {
        setEvents([]);
      }
    }

    tick();
    const timer = setInterval(tick, interval);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [interval]);

  const age = state && state.ts ? Date.now() - state.ts : Number.POSITIVE_INFINITY;
  const fresh = age >= 0 && age < 5000;

  return { state, events, fresh, age };
}
