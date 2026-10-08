import type { CategoryIconKey } from "@/lib/store/categoryIcon";

export default function CategoryIcon({ id }: { id: CategoryIconKey | "all" }) {
  const common = "mkt-category-svg";

  if (id === "food") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M10 38c3-17 13-25 25-25 11 0 18 6 22 18-10 1-17 5-23 13-7-5-15-7-24-6Z" /><path d="M13 35c11-7 26-9 40-4M27 18c-5 3-8 7-9 12M39 16c-4 4-6 8-6 13" /></svg>;
  }

  if (id === "drinks") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M20 14h25l-3 36H24l-4-36Z" /><path d="M18 14h29M34 12l8-8M29 23c5 1 9 1 13 0" /></svg>;
  }

  if (id === "desserts") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M19 30h28l-4 22H23l-4-22Z" /><path d="M17 30c2-8 7-12 13-11 2-7 8-8 12-3 7 0 10 5 9 14H17Z" /><path d="M33 14c-2-5 1-8 6-7" /></svg>;
  }

  if (id === "crafts") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M32 52C16 40 10 31 12 22c2-9 14-11 20-2 6-9 18-7 20 2 2 9-4 18-20 30Z" /><path d="M32 43c-8-7-12-12-12-17 0-5 7-6 12 0 5-6 12-5 12 0 0 5-4 10-12 17Z" /></svg>;
  }

  if (id === "stationery") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M14 13h27v38H14V13Z" /><path d="M21 21h13M21 28h13M21 35h9M45 43l9-28 5 2-9 28-7 6 2-8Z" /></svg>;
  }

  if (id === "entertainment") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><rect x="10" y="16" width="44" height="32" rx="5" /><path d="M18 16v32M46 16v32M10 25h8M10 39h8M46 25h8M46 39h8M27 27l12 5-12 6Z" /></svg>;
  }

  if (id === "clothing") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M23 15l9 7 9-7 12 9-7 9-5-4v22H23V29l-5 4-7-9 12-9Z" /></svg>;
  }

  if (id === "electronics") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><rect x="14" y="10" width="36" height="44" rx="5" /><path d="M25 16h14M27 47h10M24 28h16M24 35h16" /></svg>;
  }

  if (id === "beauty") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M22 47l8-28 8 28M26 36h8M43 14v35M39 14h8M39 49h8" /><path d="M17 51h30" /></svg>;
  }

  if (id === "services") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M17 44l18-18M31 18l7-7 8 8-7 7M15 47l8 3 3-8M37 39l11 11M43 33l8 8" /></svg>;
  }

  if (id === "books") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M9 16c9-3 17-1 23 5v31c-6-6-14-8-23-5V16ZM55 16c-9-3-17-1-23 5v31c6-6 14-8 23-5V16Z" /></svg>;
  }

  if (id === "sports") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><circle cx="32" cy="32" r="22" /><path d="M18 17l8 9-3 12-11 4M46 17l-8 9 3 12 11 4M23 38l9 7 9-7M26 26h12" /></svg>;
  }

  if (id === "all") {
    return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M12 14h16v16H12zM36 14h16v16H36zM12 38h16v12H12zM36 38h16v12H36z" /></svg>;
  }

  return <svg viewBox="0 0 64 64" className={common} aria-hidden="true"><path d="M12 20h40v28H12zM18 14h28v6M20 29h24M20 38h18" /></svg>;
}

