import type { Sticker, Theme } from "@workspace/api-client-react";

export const THEMES: { key: Theme; label: string; card: string; ink: string; accent: string }[] = [
  { key: "warm-atelier", label: "Warm Atelier", card: "#f6ece6", ink: "#1f1b17", accent: "#3525cd" },
  { key: "midnight-indigo", label: "Midnight Indigo", card: "#1c1850", ink: "#e2dfff", accent: "#c3c0ff" },
  { key: "botanical", label: "Botanical", card: "#dcf3e6", ink: "#002114", accent: "#006e4c" },
];

export const STICKERS: { key: Sticker; label: string }[] = [
  { key: "vinyl", label: "Vinyl" },
  { key: "coldbrew", label: "Cold brew" },
  { key: "spark", label: "Spark" },
  { key: "flower", label: "Flower" },
  { key: "ticket", label: "Ticket" },
];

export function StickerGlyph({ name, className }: { name: Sticker; className?: string }) {
  const p = { viewBox: "0 0 48 48", className, "aria-hidden": true, fill: "none" as const };
  switch (name) {
    case "vinyl":
      return (<svg {...p}><circle cx="24" cy="24" r="21" fill="#1f1b17" /><circle cx="24" cy="24" r="14" stroke="#4a4643" strokeWidth="1.5" /><circle cx="24" cy="24" r="8" fill="#ef9a3c" /><circle cx="24" cy="24" r="2" fill="#1f1b17" /></svg>);
    case "coldbrew":
      return (<svg {...p}><path d="M13 12h22l-3 29a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3z" fill="#d9c7b8" stroke="#1f1b17" strokeWidth="2" /><path d="M15 22h18l-1.5 19H16.5z" fill="#5b3a29" /><path d="M30 4l-4 14" stroke="#1f1b17" strokeWidth="2.5" strokeLinecap="round" /><rect x="19" y="26" width="7" height="7" rx="1.5" fill="#e9e1dd" opacity=".8" /></svg>);
    case "spark":
      return (<svg {...p}><path d="M24 3l5 15 15 6-15 6-5 15-5-15-15-6 15-6z" fill="#ffd54a" stroke="#1f1b17" strokeWidth="2" strokeLinejoin="round" /></svg>);
    case "flower":
      return (<svg {...p}>{[0, 72, 144, 216, 288].map((r) => (<ellipse key={r} cx="24" cy="12" rx="6" ry="9" fill="#ff8fab" stroke="#1f1b17" strokeWidth="1.5" transform={`rotate(${r} 24 24)`} />))}<circle cx="24" cy="24" r="5" fill="#ffd54a" stroke="#1f1b17" strokeWidth="1.5" /></svg>);
    case "ticket":
      return (<svg {...p}><path d="M5 14h38v7a3 3 0 0 0 0 6v7H5v-7a3 3 0 0 0 0-6z" fill="#85f8c4" stroke="#1f1b17" strokeWidth="2" strokeLinejoin="round" /><path d="M32 14v20" stroke="#1f1b17" strokeWidth="2" strokeDasharray="3 3" /></svg>);
  }
}
