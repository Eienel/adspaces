import { AVATAR_ZONE, BANNER_H, BANNER_W, type Rect } from "@adspaces/shared";

export type SegmentState = "free" | "booked" | "selected" | "dim";

export interface PreviewSegment extends Rect {
  idx: number;
  label?: string;
  sublabel?: string;
  state?: SegmentState;
  /** Ad image to draw inside the segment (e.g. a preview of the business's creative). */
  imageUrl?: string | null;
}

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

const STATE: Record<SegmentState, string> = {
  free: "border-white/80 bg-black/5",
  booked: "border-[var(--peach)] bg-black/50",
  selected: "border-[var(--lime)] bg-white/10 ring-2 ring-[var(--lime)]",
  dim: "border-white/20 bg-black/40",
};

/** A 3:1 banner with segment outlines on top. Works in server and client components. */
export function BannerPreview(props: {
  imageUrl: string | null;
  segments: PreviewSegment[];
  showAvatarZone?: boolean;
  onSelect?: (idx: number) => void;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[3/1] w-full overflow-hidden rounded-[var(--radius)] bg-gradient-to-br from-[var(--dark)] to-[var(--green)] ${props.className ?? ""}`}>
      {props.imageUrl && <img src={props.imageUrl} alt="Banner" className="absolute inset-0 h-full w-full object-cover" />}
      {props.segments.map((s) => {
        const Tag = props.onSelect ? "button" : "div";
        return (
          <Tag
            key={s.idx}
            type={props.onSelect ? "button" : undefined}
            onClick={props.onSelect ? () => props.onSelect!(s.idx) : undefined}
            className={`absolute flex flex-col items-center justify-center border-2 border-dashed text-center transition ${STATE[s.state ?? "free"]} ${props.onSelect ? "cursor-pointer hover:bg-[var(--lime)]/15" : ""}`}
            style={{ left: pct(s.x, BANNER_W), top: pct(s.y, BANNER_H), width: pct(s.w, BANNER_W), height: pct(s.h, BANNER_H) }}
          >
            {s.imageUrl && <img src={s.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />}
            {s.label && <span className="relative rounded-full bg-black/75 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm sm:text-xs">{s.label}</span>}
            {s.sublabel && <span className="relative mt-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/90">{s.sublabel}</span>}
          </Tag>
        );
      })}
      {props.showAvatarZone && (
        <div
          title="Your profile picture covers roughly this area on X"
          className="pointer-events-none absolute rounded-full border-2 border-[var(--bad)]/80 bg-[var(--bad)]/15"
          style={{ left: pct(AVATAR_ZONE.x, BANNER_W), top: pct(AVATAR_ZONE.y, BANNER_H), width: pct(AVATAR_ZONE.w, BANNER_W), height: pct(AVATAR_ZONE.h * 2, BANNER_H) }}
        />
      )}
    </div>
  );
}
