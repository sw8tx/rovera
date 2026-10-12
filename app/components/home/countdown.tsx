"use client";

import { useEffect, useState } from "react";

const target = new Date("2026-10-18T00:00:00+02:00").getTime();
const units = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
] as const;

function getTimeLeft(now: number) {
  let remaining = Math.max(0, target - now);
  const days = Math.floor(remaining / 86_400_000);
  remaining %= 86_400_000;
  const hours = Math.floor(remaining / 3_600_000);
  remaining %= 3_600_000;
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return { days, hours, minutes, seconds };
}

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft> | null>(null);

  useEffect(() => {
    const update = () => setTimeLeft(getTimeLeft(Date.now()));
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="rv-countdown" id="shop-coming-soon" aria-labelledby="countdown-title">
      <div className="rv-countdown-inner">
        <p className="rv-countdown-kicker">A date worth waiting for</p>
        <h2 id="countdown-title">Something good is on its way.</h2>
        <p className="rv-countdown-date">Sunday, October 18, 2026</p>
        <div className="rv-countdown-clock" role="timer" aria-live="off">
          {units.map(({ key, label }) => {
            const value = timeLeft
              ? key === "days"
                ? String(timeLeft[key])
                : String(timeLeft[key]).padStart(2, "0")
              : "—";
            return (
              <div className={`rv-countdown-unit rv-countdown-${key}`} key={key}>
                <div className="rv-countdown-value" aria-label={`${value} ${label}`}>
                  {value.split("").map((digit, index) => (
                    <span className="rv-countdown-digit" key={`${key}-${index}-${digit}`}>
                      {digit}
                    </span>
                  ))}
                </div>
                <span className="rv-countdown-label">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
