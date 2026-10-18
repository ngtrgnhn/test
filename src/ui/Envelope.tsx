import { useEffect, useMemo, useRef, useState } from "react";
import { makeT, type PartyConfig } from "../config";
import { useParty } from "../store";
import { HeartIcon, SparkIcon } from "./icons";
import { LetterPaper } from "./LetterPaper";

type Stage = "closed" | "flap" | "fly" | "dissolve" | "reading";

function FloatingHearts() {
  const hearts = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        left: `${(i * 83) % 100}%`,
        size: 13 + ((i * 37) % 24),
        dur: 9 + ((i * 53) % 8),
        delay: -((i * 97) % 12),
        o: 0.2 + ((i * 29) % 35) / 100,
        dx: ((i * 41) % 80) - 40,
        color: i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#ffc1da" : "#ffd98a",
      })),
    []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {hearts.map((h, i) => (
        <span
          key={i}
          className="absolute bottom-0"
          style={{
            left: h.left,
            color: h.color,
            width: h.size,
            height: h.size,
            animation: `drift ${h.dur}s linear infinite`,
            animationDelay: `${h.delay}s`,
            ["--o" as string]: h.o,
            ["--dx" as string]: `${h.dx}px`,
            opacity: 0,
          }}
        >
          <HeartIcon className="h-full w-full" />
        </span>
      ))}
    </div>
  );
}

/* paper bits that burst when the envelope dissolves */
function Shreds() {
  const bits = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2 + Math.random() * 0.6;
        const d = 130 + Math.random() * 220;
        return {
          tx: `${Math.cos(a) * d}px`,
          ty: `${Math.sin(a) * d - 70}px`,
          rot: `${Math.random() * 540 - 270}deg`,
          w: 10 + Math.random() * 18,
          h: 8 + Math.random() * 14,
          delay: Math.random() * 0.12,
          color: ["#ffffff", "#ffd9e8", "#ff9ec6", "#fff0f6"][i % 4],
          x: Math.random() * 100,
          y: Math.random() * 100,
          r: Math.random() * 50,
        };
      }),
    []
  );
  return (
    <>
      {bits.map((b, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.w,
            height: b.h,
            background: b.color,
            borderRadius: `${b.r}% ${100 - b.r}% ${b.r}% ${100 - b.r}%`,
            animation: `shredFly .95s cubic-bezier(.3,.6,.6,1) ${b.delay}s forwards`,
            ["--tx" as string]: b.tx,
            ["--ty" as string]: b.ty,
            ["--rot" as string]: b.rot,
            boxShadow: "0 4px 10px rgba(214,51,132,.2)",
          }}
        />
      ))}
    </>
  );
}

/* little hearts that pop out of the wax seal the moment it is pressed */
function SealBurst() {
  const hearts = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
        const d = 70 + Math.random() * 130;
        return {
          tx: `${Math.cos(a) * d}px`,
          ty: `${Math.sin(a) * d - 30}px`,
          rot: `${Math.random() * 120 - 60}deg`,
          size: 12 + Math.random() * 16,
          delay: Math.random() * 0.08,
          color: ["#ffffff", "#ffd3e5", "#ff9ec6", "#ffd98a"][i % 4],
        };
      }),
    []
  );
  return (
    <>
      {hearts.map((h, i) => (
        <span
          key={i}
          className="absolute left-0 top-0"
          style={{
            width: h.size,
            height: h.size,
            color: h.color,
            animation: `burstHeart .8s cubic-bezier(.2,.7,.3,1) ${h.delay}s forwards`,
            ["--tx" as string]: h.tx,
            ["--ty" as string]: h.ty,
            ["--rot" as string]: h.rot,
          }}
        >
          <HeartIcon className="h-full w-full" />
        </span>
      ))}
    </>
  );
}

export function Envelope({ config }: { config: PartyConfig }) {
  const [stage, setStage] = useState<Stage>("closed");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  /** set when the seal is pressed: where the heart-wipe grows from */
  const [wipe, setWipe] = useState<{ x: number; y: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const enterParty = useParty((s) => s.enterParty);
  const T = useMemo(() => makeT(config), [config]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /** the heart-shaped wax seal is the one and only way into the party */
  const pressSeal = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (wipe) return;
    const r = e.currentTarget.getBoundingClientRect();
    setWipe({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    // the pink heart has swallowed the screen at ~700 ms → open the doors underneath
    timers.current.push(window.setTimeout(enterParty, 720));
  };

  const doOpen = () => {
    if (stage !== "closed") return;
    setStage("flap");
    timers.current.push(
      window.setTimeout(() => setStage("fly"), 520),       // letter slides out
      window.setTimeout(() => setStage("dissolve"), 1050), // envelope melts into shreds
      window.setTimeout(() => setStage("reading"), 1650)   // letter arrives up front
    );
  };

  const onMove = (e: React.MouseEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: nx * 6, y: -ny * 6 });
  };

  const flapOpen = stage !== "closed";
  const envGone = stage === "dissolve";
  const letterOut = stage === "fly" || stage === "dissolve";
  const reading = stage === "reading";

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" data-envelope-stage={stage}>
      {/* layered soft background */}
      <div className="absolute inset-0 bg-[linear-gradient(168deg,#ffc4dc_0%,#ff9ec6_40%,#f97fb4_100%)]" />
      <div className="absolute inset-0 bg-dots opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_36%,rgba(255,250,252,0.55),transparent_56%)]" />
      <FloatingHearts />
      <div className="absolute top-10 left-7 text-white/70 anim-floaty" style={{ ["--r" as string]: "-12deg" }}>
        <SparkIcon className="w-9 h-9" />
      </div>
      <div className="absolute bottom-16 right-9 text-butter/90 anim-floaty" style={{ ["--r" as string]: "14deg", animationDelay: "-2s" }}>
        <SparkIcon className="w-12 h-12" />
      </div>

      <div className="relative h-full w-full flex flex-col items-center justify-center gap-6 px-4 py-8 overflow-y-auto scroll-none">
        {/* kicker + title */}
        <div
          className="anim-rise flex flex-col items-center gap-2 transition-opacity duration-500"
          style={{ animationDelay: "80ms", opacity: stage === "closed" ? 1 : 0 }}
        >
          <div className="ribbon-banner ribbon-banner--light soft-shadow-sm px-5 py-2 -rotate-1">
            <span className="font-display font-bold uppercase tracking-[0.14em] text-[13px] md:text-sm text-[#a8195c]">
              {config.event.kicker}
            </span>
          </div>
          {config.event.title && (
            <h1 className="paper-script text-center text-[34px] md:text-[42px] leading-tight text-white text-legible">
              {config.event.title}
            </h1>
          )}
        </div>

        {/* ---------- envelope ---------- */}
        <div
          ref={wrap}
          onMouseMove={onMove}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
          className="anim-pop relative"
          style={{
            perspective: "1100px",
            opacity: reading ? 0 : 1,
            pointerEvents: stage === "closed" ? "auto" : "none",
          }}
        >
          {/* shreds live here so they burst from the envelope position */}
          {envGone && <Shreds />}

          {stage !== "reading" && (
            <div
              className="relative w-[min(88vw,460px)] transition-transform duration-300 ease-out"
              style={{
                transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className={`airmail relative rounded-[30px] p-[9px] soft-shadow ${
                  stage === "closed" ? "cursor-pointer hover:scale-[1.02] transition-transform duration-300" : ""
                }`}
                style={envGone ? { animation: "envelopeMelt .55s ease-in forwards" } : undefined}
                role={stage === "closed" ? "button" : undefined}
                tabIndex={stage === "closed" ? 0 : -1}
                aria-label={T("envelopeTap")}
                onKeyDown={e => { if (stage === "closed" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); doOpen(); } }}
                onClick={stage === "closed" ? doOpen : undefined}
              >
              <div
                className="relative aspect-[3/2.05] overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#f97fb4,#ee5f9f)]"
              >
                {/* envelope liner revealed when the flap opens */}
                <div
                  className={`absolute inset-x-0 top-0 h-[56%] transition-opacity duration-300 ${
                    flapOpen ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    zIndex: 32,
                    backgroundColor: "#b23a6f",
                    backgroundImage:
                      "radial-gradient(rgba(255,244,248,.35) 2.4px, transparent 2.6px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                {/* peeking letter */}
                <div
                  className={`absolute left-[6%] right-[6%] bottom-[8%] transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${
                    letterOut ? "-translate-y-[52%]" : "translate-y-[3%]"
                  }`}
                  data-peek-letter
                  style={{ zIndex: 35, visibility: stage === "closed" || stage === "flap" ? "hidden" : "visible" }}
                >
                  <div className="rounded-[20px] bg-[linear-gradient(180deg,#fffafc,#fff0f6)] border border-white soft-shadow-sm px-6 py-5">
                    <p className="font-body text-[13px] uppercase tracking-[0.16em] text-ink-soft font-semibold">
                      {T("envelopeLabel")}
                    </p>
                    <p className="font-display font-extrabold text-punch-deep text-3xl md:text-4xl leading-tight">
                      {config.recipient.name}
                    </p>
                    <p className="mt-2 text-sm text-ink-soft font-medium">
                      {T("envelopeFrom")}
                    </p>
                  </div>
                </div>

                {/* front pocket */}
                <div
                  className="absolute inset-0 rounded-[26px] bg-[linear-gradient(180deg,#ffb0cf,#ff97bf)]"
                  style={{
                    clipPath: "polygon(0 0, 50% 56.5%, 100% 0, 100% 100%, 0 100%)",
                    zIndex: 40,
                  }}
                >
                  <div className="absolute inset-0 bg-stripes opacity-60" />
                  <div className="absolute inset-x-0 top-[64%] flex flex-col items-center gap-0.5">
                    <span className="paper-hand !text-[20px] !leading-tight text-[#7c2a50]">
                      {T("envelopeAddress")}
                    </span>
                    <span className="paper-hand !text-[16px] !leading-tight text-[#7c2a50]">
                      {T("envelopeAddressFrom")}
                    </span>
                  </div>
                  <div className="stamp absolute right-[7%] top-[32%] rotate-6">
                    <div className="stamp-inner flex h-10 w-9 items-center justify-center">
                      <HeartIcon className="w-4 h-4 text-punch-deep" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-[6%] flex justify-center text-white/90">
                    <HeartIcon className="w-6 h-6 anim-heart" />
                  </div>
                </div>

                {/* flap */}
                <div
                  className="absolute left-0 right-0 top-0 h-[58%] transition-transform duration-500 ease-in-out"
                  style={{
                    transformOrigin: "top center",
                    transform: flapOpen ? "rotateX(-176deg)" : "rotateX(0deg)",
                    zIndex: flapOpen ? 20 : 45,
                    backfaceVisibility: "visible",
                  }}
                >
                  <div
                    className="w-full h-full bg-[linear-gradient(180deg,#ee5f9f,#e84a8f)]"
                    style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
                  >
                    <div className="absolute inset-0 bg-stripes opacity-40" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
                  </div>
                </div>

                {/* seal indicator - visual only, click anywhere on envelope to open */}
                {stage === "closed" && (
                  <div
                    className="absolute left-1/2 top-[48%] anim-ring rounded-full pointer-events-none"
                    style={{
                      zIndex: 50,
                      transform: "translate(-50%, -50%)",
                      animationName: "pulseRing, sealWiggle",
                    }}
                  >
                    <span className="block rounded-full bg-white p-[5px] soft-shadow-sm">
                      <span className="flex w-14 h-14 md:w-16 md:h-16 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ff7db4,#e84a8f)] text-white">
                        <HeartIcon className="w-7 h-7" />
                      </span>
                    </span>
                  </div>
                )}
              </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------- the letter flies up front ---------- */}
        {(stage === "dissolve" || reading) && (
          <div
            className={`absolute inset-0 z-20 flex items-center justify-center px-4 ${
              reading ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{ perspective: "1200px" }}
          >
            <div
              className="w-[min(92vw,560px)] transition-all duration-[850ms] ease-[cubic-bezier(.22,1,.36,1)]"
              style={{
                transform: reading ? "none" : "translateY(20vh) scale(.5) rotateX(26deg)",
                opacity: reading ? 1 : 0,
              }}
            >
              {reading ? (
                <div
                  className="relative max-h-[70vh] overflow-y-auto scroll-pink rounded-[12px] -rotate-1 w-full transition-all duration-[650ms] ease-in"
                  style={
                    wipe
                      ? { transform: "translateY(-6vh) scale(.92) rotate(-3deg)", opacity: 0.0 }
                      : undefined
                  }
                >
                  <LetterPaper
                    config={config}
                    onSeal={pressSeal}
                    sealLabel={T("enterAria")}
                  />
                </div>
              ) : (
                <div className="relative max-h-[70vh] overflow-y-auto scroll-pink rounded-[12px] -rotate-1">
                  <LetterPaper config={config} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* bottom caption - click vào phong bì để mở */}
        {stage === "closed" && (
          <div className="anim-rise flex flex-col items-center gap-2" style={{ animationDelay: "200ms" }}>
            <HeartIcon className="w-8 h-8 text-white anim-heart" />
            <p className="hud-chip hud-chip--soft ribbon-banner rounded-full px-4 py-2 text-center text-[15px] font-semibold md:text-base">
              {T("envelopeTap")}
            </p>
          </div>
        )}
        {(stage === "flap" || stage === "fly" || stage === "dissolve") && (
          <p className="hud-chip hud-chip--soft ribbon-banner anim-bob rounded-full px-4 py-2 text-center text-[15px] font-semibold md:text-base">
            {T("letterFlying")}
          </p>
        )}
      </div>

      {/* hint: the heart on the letter is the way in (text only — not a button) */}
      {reading && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom))] z-30 flex justify-center px-6 anim-rise transition-opacity duration-300"
          style={{ animationDelay: "350ms", opacity: wipe ? 0 : 1 }}
        >
          <p className="hud-chip hud-chip--soft ribbon-banner rounded-full px-4 py-2 text-center text-[15px] font-semibold md:text-base">
            <HeartIcon className="anim-heart h-4 w-4 shrink-0 text-butter" />
            {T("enterHint")}
          </p>
        </div>
      )}

      {/* heart wipe: grows out of the seal and floods the screen, then the party opens beneath it */}
      {wipe && (
        <div
          className="pointer-events-none fixed z-[70]"
          style={{ left: wipe.x, top: wipe.y, width: 0, height: 0 }}
        >
          <SealBurst />
          <span className="heart-wipe">
            <HeartIcon className="h-full w-full" />
          </span>
        </div>
      )}
    </div>
  );
}
