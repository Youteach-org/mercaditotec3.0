"use client";

import { useId } from "react";

const CLOUD_PATHS = [
  "M80 112 C100 49 190 32 270 53 C330 14 430 18 490 49 C560 14 680 18 730 53 C820 25 910 56 920 119 C985 140 995 210 950 252 C995 301 995 371 950 413 C990 476 950 546 870 560 C860 630 760 665 680 637 C620 683 510 690 440 658 C360 690 250 676 210 630 C120 658 40 609 50 553 C0 511 15 434 65 406 C15 350 20 280 70 245 C20 196 25 140 80 112 Z",
  "M55 140 C55 77 140 39 220 56 C290 18 390 25 450 53 C520 14 630 14 690 49 C780 25 880 49 900 105 C975 126 995 196 955 245 C995 294 995 364 950 413 C985 483 940 546 860 560 C830 630 730 658 650 630 C580 679 470 686 400 651 C310 679 210 658 180 609 C90 630 20 581 45 525 C0 476 15 406 60 378 C15 322 20 245 65 217 C20 189 20 161 55 140 Z",
  "M45 126 C65 67 140 39 220 56 C280 18 390 21 450 49 C520 18 620 14 680 46 C760 18 870 39 900 98 C975 112 995 182 955 231 C995 280 995 350 955 392 C990 455 950 518 880 539 C860 609 760 644 680 623 C610 665 510 676 440 648 C350 679 250 665 200 620 C110 644 35 599 50 546 C5 504 10 427 55 396 C10 343 15 273 60 238 C20 196 15 154 45 126 Z",
  "M65 119 C75 63 150 39 230 56 C300 18 400 21 460 49 C540 14 650 21 700 53 C790 25 890 53 910 112 C980 133 995 203 955 252 C995 308 990 378 945 420 C985 483 940 553 860 567 C830 630 730 658 650 630 C580 679 470 686 400 651 C310 679 220 658 180 609 C90 637 20 588 45 532 C0 483 15 413 60 378 C15 322 20 252 65 217 C20 175 25 140 65 119 Z",
  "M45 147 C55 84 140 49 220 63 C290 25 380 28 450 53 C530 18 630 21 690 49 C780 25 880 49 910 105 C980 126 995 196 955 245 C995 301 990 371 950 413 C990 476 950 539 870 560 C850 623 750 658 670 630 C600 676 500 679 430 648 C340 679 240 662 200 616 C110 637 35 595 50 539 C5 490 15 420 60 385 C15 336 20 266 65 231 C20 189 20 161 45 147 Z",
  "M40 133 C55 74 135 42 215 60 C280 21 380 21 445 49 C520 14 630 18 690 49 C780 21 880 42 910 102 C980 119 995 189 955 238 C995 294 990 364 950 406 C990 469 950 532 875 553 C850 620 750 651 670 627 C600 672 500 679 430 648 C340 679 240 662 190 616 C100 641 30 595 50 543 C5 494 15 424 60 389 C15 336 20 266 60 231 C20 189 15 154 40 133 Z",
] as const;

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
  const patternId = `mkt-cloud-pattern-${rawId}`;
  const normalizedVariant =
    ((variantIndex % CLOUD_PATHS.length) + CLOUD_PATHS.length) % CLOUD_PATHS.length;
  const path = CLOUD_PATHS[normalizedVariant];

  return (
    <svg
      className={`mkt-store-photo-svg mkt-store-photo-svg-${normalizedVariant}`}
      data-image-zoom-src={imageUrl || undefined}
      data-image-zoom-alt={imageUrl ? "Portada completa de la tienda" : undefined}
      viewBox="0 0 1000 700"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="1000"
          height="700"
        >
          <rect x="0" y="0" width="1000" height="700" fill="#fffdf6" />
          {imageUrl ? (
            <image
              href={imageUrl}
              x="82"
              y="58"
              width="836"
              height="584"
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <>
              <rect x="24" y="18" width="952" height="664" fill="#ffd54c" />
              <text
                x="500"
                y="350"
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
        </pattern>
      </defs>

      <path
        d={path}
        fill={`url(#${patternId})`}
        stroke="#fffdf6"
        strokeWidth="24"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
