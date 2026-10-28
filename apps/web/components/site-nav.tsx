"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Segmented nav tabs (wispr-style). Purely visual: highlights the section you're in. */
export function SiteNav({ items, className = "" }: { items: readonly (readonly [string, string])[]; className?: string }) {
  const path = usePathname();
  return (
    <div className={`nav-tabs ${className}`}>
      {items.map(([href, label]) => (
        <Link key={href} href={href} className={`nav-tab ${path === href || path.startsWith(`${href}/`) ? "nav-tab-on" : ""}`}>
          {label}
        </Link>
      ))}
    </div>
  );
}
