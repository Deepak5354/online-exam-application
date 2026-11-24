import { useEffect, useState } from "react";

/**
 * Counts down to a moment in time (the attempt's `deadlineAt`).
 *
 * The deadline comes from the server, so the number shown here is the same on
 * every device and survives a refresh. `onExpire` fires once when it reaches
 * zero; the server still grades and validates the submission time itself.
 */
export function useCountdown(deadlineAt: string | null | undefined, onExpire?: () => void) {
  const target = deadlineAt ? new Date(deadlineAt).getTime() : null;
  const remaining = () => (target == null ? 0 : Math.max(0, Math.ceil((target - Date.now()) / 1000)));
  const [seconds, setSeconds] = useState(remaining);

  useEffect(() => {
    if (target == null) return;
    setSeconds(remaining);
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setSeconds(left);
      if (left === 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => {
    if (seconds === 0 && target != null) onExpire?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, target]);

  return seconds;
}
