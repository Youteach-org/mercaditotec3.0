"use client";

export default function MarketplaceRibbon({
  label,
  slotIndex = 0,
}: {
  label: string;
  slotIndex?: number;
}) {
  const clean = label.trim();
  if (!clean) return null;

  return (
    <div
      className={`mkt-store-ribbon mkt-store-ribbon-${slotIndex}`}
      title={clean}
    >
      <span className="mkt-store-ribbon-text">{clean}</span>
    </div>
  );
}
