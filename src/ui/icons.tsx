interface IconProps {
  className?: string;
}

const base = "inline-block shrink-0";

export function HeartIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden>
      <path d="M12 21s-7.5-4.7-10-9.3C.4 8.7 2.2 4.9 5.7 4.3c2-.3 4 .6 5.1 2.2h2.4c1.1-1.6 3.1-2.5 5.1-2.2 3.5.6 5.3 4.4 3.7 7.4C19.5 16.3 12 21 12 21z" />
    </svg>
  );
}

export function EnvelopeIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`${base} ${className}`} aria-hidden>
      <path d="M3 6h18v13H3z" strokeLinejoin="round" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LetterIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`${base} ${className}`} aria-hidden>
      <path d="M5 3h11l3 3v15H5z" strokeLinejoin="round" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4.5" strokeLinecap="round" />
    </svg>
  );
}

export function FlameIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden>
      <path d="M12 2c.6 3.4-1.8 5-3.2 6.8C7.3 10.7 6.5 12.5 6.5 14.5a5.5 5.5 0 0 0 11 0c0-1.6-.6-3-1.4-4.3-.4 1-1 1.7-1.9 2.2.3-2.6-.7-6.5-2.2-8.4z" />
    </svg>
  );
}

export function SparkIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${base} ${className}`} aria-hidden>
      <path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7z" />
      <path d="M19 15l1 2.8L23 19l-3 1.2L19 23l-1-2.8L15 19l3-1.2z" opacity=".8" />
    </svg>
  );
}

export function CakeIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className={`${base} ${className}`} aria-hidden>
      <path d="M4 20v-7h16v7M2.5 20h19M7 13v-3.5h10V13M12 6.5V4.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 4.6c-.9-.9-.2-2.4 0-2.6.2.2.9 1.7 0 2.6z" fill="currentColor" stroke="none" />
      <path d="M4 16.5c1.6 1.2 3-1.2 4.5 0s2.9 1.2 4.5 0 2.9-1.2 4.5 0 1.9 1 2.5.6" strokeLinecap="round" />
    </svg>
  );
}

export function MatchIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className={`${base} ${className}`} aria-hidden>
      <path d="M7 21L16.5 8.5" strokeLinecap="round" />
      <path d="M17.5 7.6c-.9-.9-.3-2.5 0-2.9.3.4 1.9 1.4.7 3a1.6 1.6 0 0 1-.7-.1z" fill="currentColor" stroke="none" />
      <path d="M19.8 4.2c.6-.6 1.8-.4 2 .6" strokeLinecap="round" />
    </svg>
  );
}

export function CalendarIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className={`${base} ${className}`} aria-hidden>
      <path d="M4 6h16v15H4zM4 10.5h16M8 3.5V7M16 3.5V7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PinIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className={`${base} ${className}`} aria-hidden>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function ClockIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className={`${base} ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className={`${base} ${className}`} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`${base} ${className}`} aria-hidden>
      <path d="M4 12h15M13 5.5L19.5 12 13 18.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CameraIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className={`${base} ${className}`} aria-hidden>
      <path d="M3 8.5h4l1.8-2.5h6.4L17 8.5h4V19H3z" strokeLinejoin="round" />
      <circle cx="12" cy="13.4" r="3.4" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className={`${base} ${className}`} aria-hidden>
      <path d="M5 9.5l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GiftIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className={`${base} ${className}`} aria-hidden>
      <path d="M4 11h16v9.5H4zM3 7.5h18V11H3zM12 7.5v13" strokeLinejoin="round" />
      <path d="M12 7.5s-4.5.3-5.6-1.8c-.9-1.8 1.2-3.3 2.7-2.4 1.6 1 2.9 4.2 2.9 4.2zm0 0s4.5.3 5.6-1.8c.9-1.8-1.2-3.3-2.7-2.4-1.6 1-2.9 4.2-2.9 4.2z" strokeLinejoin="round" />
    </svg>
  );
}

export function WindIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`${base} ${className}`} aria-hidden>
      <path d="M3 8.5h11a2.6 2.6 0 1 0-2.5-3.3M3 13h15.5a2.7 2.7 0 1 1-2.6 3.4M3 17.5h7.5" strokeLinecap="round" />
    </svg>
  );
}
