import { useTheme } from "@/hooks/useTheme";

export function OnboardingLogoSVG() {
  const { isLight } = useTheme();
  return (
    <svg
      viewBox="0 0 818 514"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
    >
      <g filter="url(#filter0_i_onboarding)">
        <rect
          width="818"
          height="514"
          fill="url(#paint0_linear_onboarding)"
          fillOpacity={isLight ? 0.5 : 0.28}
          mask="url(#mask0_onboarding)"
        />
      </g>
      <defs>
        {/* Mission LLM emblem silhouette (media/logo/mission-llm-icon.svg geometry), centered in the original 818x514 frame. */}
        <mask
          id="mask0_onboarding"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="818"
          height="514"
        >
          <g transform="translate(409 257) scale(1.06) translate(-256 -256)">
            <circle
              cx="256"
              cy="256"
              r="227"
              fill="none"
              stroke="white"
              strokeWidth="18"
            />
            <g transform="rotate(-24 256 292)">
              <ellipse
                cx="256"
                cy="292"
                rx="190"
                ry="72"
                fill="none"
                stroke="white"
                strokeWidth="14"
              />
              <circle cx="446" cy="292" r="16" fill="white" />
            </g>
            <path
              d="M256 148 L360 358 L256 312 L152 358 Z"
              fill="black"
              stroke="black"
              strokeWidth="16"
              strokeLinejoin="round"
            />
            <path
              d="M256 148 L360 358 L256 312 L152 358 Z M256 210 L320 338 L256 316 L192 338 Z"
              fill="white"
              fillRule="evenodd"
            />
            <path
              d="M256 92 l7.5 19 19 7.5 -19 7.5 -7.5 19 -7.5 -19 -19 -7.5 19 -7.5 z"
              fill="white"
            />
          </g>
        </mask>
        <filter
          id="filter0_i_onboarding"
          x="0"
          y="0"
          width="817.643"
          height="525.847"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="12" />
          <feGaussianBlur stdDeviation="6" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
          />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
        <linearGradient
          id="paint0_linear_onboarding"
          x1="15.9568"
          y1="-4.97115"
          x2="720.527"
          y2="514.346"
          gradientUnits="userSpaceOnUse"
        >
          {isLight ? (
            <>
              <stop stopColor="#B0BAC5" />
              <stop offset="0.538462" stopColor="#FFFFFF" stopOpacity="0.4" />
              <stop offset="1" stopColor="#A8B0BE" />
            </>
          ) : (
            <>
              <stop stopColor="#3C5769" />
              <stop
                offset="0.538462"
                stopColor="#9FA5C2"
                stopOpacity="0.253846"
              />
              <stop offset="1" stopColor="#40435E" />
            </>
          )}
        </linearGradient>
      </defs>
    </svg>
  );
}
