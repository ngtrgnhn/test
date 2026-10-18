import { joinNonEmpty, type PartyConfig } from "../config";
import { HeartIcon } from "./icons";

/**
 * A paper letter that looks like a paper letter:
 * ruled sheet + red margin line, washi tape, postage stamp with postmark,
 * handwriting fonts, marker-highlighted wish, wax seal and little doodles.
 *
 * When `onSeal` is given, the heart-shaped wax seal in the bottom-right corner
 * becomes the (only) control that opens the party.
 */
export function LetterPaper({
  config,
  className = "",
  onSeal,
  sealLabel = "Vào tiệc",
}: {
  config: PartyConfig;
  className?: string;
  onSeal?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  sealLabel?: string;
}) {
  const { letter, recipient, sender, event } = config;
  const where = joinNonEmpty([event.place, event.date]);
  return (
    <div className={`paper rounded-[6px] px-6 pb-14 pt-12 sm:px-10 md:px-12 ${className}`}>
      {/* washi tape */}
      <span className="tape -top-3 left-6 -rotate-6 rounded-[3px]" aria-hidden />
      <span className="tape -top-2 right-8 rotate-3 rounded-[3px] hidden sm:block" aria-hidden />

      {/* postage stamp + postmark */}
      <div className="absolute right-5 top-6 sm:right-8" aria-hidden>
        <div className="stamp rotate-3">
          <div className="stamp-inner w-[54px] h-[64px] sm:w-[62px] sm:h-[72px] flex flex-col items-center justify-center gap-0.5">
            <HeartIcon className="w-6 h-6 text-punch-deep" />
            <span className="font-display font-extrabold text-punch-deep text-lg leading-none">
              {recipient.age}
            </span>
          </div>
        </div>
        <div className="postmark-ring w-[72px] h-[72px] absolute -left-12 -top-3 -rotate-12 flex items-center justify-center">
          <span className="paper-hand !text-[11px] !leading-none text-ink/60">{event.date}</span>
        </div>
        <svg
          className="absolute -left-[104px] top-7 -rotate-6 text-ink/35"
          width="70" height="26" viewBox="0 0 70 26" fill="none" aria-hidden
        >
          <path d="M2 5c14 4 22-6 34-2s20 4 32 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M2 13c14 4 22-6 34-2s20 4 32 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M2 21c14 4 22-6 34-2s20 4 32 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* margin doodle */}
      <HeartIcon className="absolute left-[13px] top-24 w-4 h-4 text-punch/60 rotate-12" />
      <svg
        className="absolute left-[10px] top-40 w-5 h-5 text-butter rotate-[-14deg]"
        viewBox="0 0 24 24" fill="currentColor" aria-hidden
      >
        <path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7z" />
      </svg>

      {/* handwriting */}
      <div className="paper-hand">
        <p className="paper-script text-[30px] sm:text-[34px] font-semibold text-punch-deep leading-[40px] mb-[8px]">
          {letter.heading}
        </p>
        <p className="mt-[6px]">{letter.body}</p>
        <p className="mt-[2px]">
          <span className="marker-hl font-semibold text-[#8c2f58]">{letter.wish}</span>
        </p>
        {letter.ps && (
          <p className="mt-[10px] text-[17px] text-ink-soft italic">{letter.ps}</p>
        )}

        {/* signature */}
        <div className="mt-[16px] flex flex-col items-end pr-2 sm:pr-6">
          <p className="paper-script text-[26px] sm:text-[28px] font-semibold text-punch-deep leading-none">
            {sender.signature.replace(/^—\s*/, "")}
          </p>
          <svg width="190" height="18" viewBox="0 0 190 18" fill="none" className="mt-1 text-punch/70" aria-hidden>
            <path
              d="M4 12c38-10 74 6 108-4 22-6 44-6 74-2"
              stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
            />
            <path d="M150 13c10 2 20 1 34-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".7" />
          </svg>
        </div>
      </div>

      {/* place + date, then the wax seal */}
      {where && (
        <div className="absolute bottom-5 left-6 sm:left-10 paper-hand !text-[15px] text-ink-soft">
          {where}
        </div>
      )}
      {onSeal ? (
        /* sticky anchor: on a short screen the seal rides along at the bottom-right of the
           visible part of the letter, then settles into its corner at the very end */
        <div className="sticky bottom-[54px] z-10 h-0">
          <button
            type="button"
            onClick={onSeal}
            aria-label={sealLabel}
            title={sealLabel}
            className="seal seal-live absolute right-0 bottom-[-40px] w-[54px] h-[54px] rounded-full flex items-center justify-center -rotate-8 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-punch/60"
          >
            <HeartIcon className="w-6 h-6 text-paper/90 translate-y-[1px] anim-heart" />
          </button>
        </div>
      ) : (
        <div className="seal absolute bottom-4 right-6 sm:right-10 w-[54px] h-[54px] rounded-full flex items-center justify-center -rotate-8">
          <HeartIcon className="w-6 h-6 text-paper/90 translate-y-[1px]" />
        </div>
      )}
    </div>
  );
}
