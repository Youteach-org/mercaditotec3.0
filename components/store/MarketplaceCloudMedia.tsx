"use client";

import { useId } from "react";

type CloudFamily = 0 | 1 | 2;

const FAMILY_BY_VARIANT: CloudFamily[] = [0, 1, 2, 0, 1, 2];

function CloudShapes({ family }: { family: CloudFamily }) {
  if (family === 0) {
    return (
      <>
        <ellipse cx="100" cy="154" rx="230" ry="217" />
        <ellipse cx="300" cy="77" rx="270" ry="189" />
        <ellipse cx="550" cy="63" rx="290" ry="182" />
        <ellipse cx="800" cy="105" rx="250" ry="203" />
        <ellipse cx="940" cy="252" rx="190" ry="238" />
        <ellipse cx="930" cy="504" rx="200" ry="217" />
        <ellipse cx="760" cy="637" rx="270" ry="175" />
        <ellipse cx="490" cy="658" rx="280" ry="168" />
        <ellipse cx="230" cy="623" rx="250" ry="189" />
        <ellipse cx="70" cy="441" rx="200" ry="224" />
        <rect x="80" y="42" width="840" height="616" />
        <rect x="25" y="133" width="950" height="434" />
      </>
    );
  }

  if (family === 1) {
    return (
      <>
        <ellipse cx="80" cy="210" rx="210" ry="238" />
        <ellipse cx="240" cy="84" rx="250" ry="196" />
        <ellipse cx="490" cy="56" rx="290" ry="168" />
        <ellipse cx="740" cy="91" rx="260" ry="189" />
        <ellipse cx="940" cy="217" rx="200" ry="245" />
        <ellipse cx="940" cy="462" rx="200" ry="238" />
        <ellipse cx="770" cy="616" rx="260" ry="189" />
        <ellipse cx="520" cy="658" rx="280" ry="161" />
        <ellipse cx="270" cy="630" rx="250" ry="182" />
        <ellipse cx="80" cy="476" rx="210" ry="238" />
        <rect x="70" y="46" width="860" height="609" />
        <rect x="20" y="140" width="960" height="420" />
      </>
    );
  }

  return (
    <>
      <ellipse cx="70" cy="217" rx="190" ry="266" />
      <ellipse cx="220" cy="91" rx="230" ry="217" />
      <ellipse cx="450" cy="56" rx="270" ry="189" />
      <ellipse cx="680" cy="77" rx="250" ry="196" />
      <ellipse cx="910" cy="182" rx="200" ry="259" />
      <ellipse cx="940" cy="434" rx="190" ry="266" />
      <ellipse cx="780" cy="602" rx="230" ry="217" />
      <ellipse cx="550" cy="658" rx="270" ry="182" />
      <ellipse cx="310" cy="637" rx="260" ry="189" />
      <ellipse cx="80" cy="490" rx="200" ry="252" />
      <rect x="60" y="49" width="880" height="602" />
      <rect x="15" y="147" width="970" height="406" />
    </>
  );
}

export default function MarketplaceCloudMedia({
  variantIndex,
  imageUrl,
  fallbackLabel = "TIENDA",
}: {
  variantIndex: number;
  imageUrl: string | null;
  fallbackLabel?: string;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const outerClipId = `mkt-cloud-outer-${rawId}`;
  const innerClipId = `mkt-cloud-inner-${rawId}`;
  const normalizedVariant =
    ((variantIndex % FAMILY_BY_VARIANT.length) + FAMILY_BY_VARIANT.length) %
    FAMILY_BY_VARIANT.length;
  const family = FAMILY_BY_VARIANT[normalizedVariant];

  return (
    <svg
      className={`mkt-store-photo-svg mkt-store-photo-svg-${normalizedVariant}`}
      viewBox="0 0 1000 700"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={outerClipId} clipPathUnits="userSpaceOnUse">
          <CloudShapes family={family} />
        </clipPath>
        <clipPath id={innerClipId} clipPathUnits="userSpaceOnUse">
          <g transform="translate(35 24.5) scale(.93)">
            <CloudShapes family={family} />
          </g>
        </clipPath>
      </defs>

      <g clipPath={`url(#${outerClipId})`}>
        <rect x="0" y="0" width="1000" height="700" fill="#fffdf6" />
      </g>

      <g clipPath={`url(#${innerClipId})`}>
        <rect x="0" y="0" width="1000" height="700" fill="#fffdf6" />
        {imageUrl ? (
          <image
            href={imageUrl}
            x="35"
            y="24"
            width="930"
            height="652"
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <>
            <rect x="35" y="24" width="930" height="652" fill="#ffd54c" />
            <text
              x="500"
              y="352"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#12346f"
              fontSize="68"
              fontWeight="900"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              {fallbackLabel}
            </text>
          </>
        )}
      </g>
    </svg>
  );
}
