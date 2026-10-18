import { Fragment, type ReactNode } from "react";

/** Tiny markup for config texts: "**bold**" → <b>bold</b>. Everything else stays plain text. */
export function renderRich(text: string, boldClass = ""): ReactNode {
  return text.split("**").map((part, i) =>
    i % 2 === 1 ? (
      <b key={i} className={boldClass}>
        {part}
      </b>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}
