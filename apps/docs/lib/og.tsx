import { ImageResponse } from "next/og";
import { levelFromScore, type ScoreLevel } from "./share-token";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

interface OgConfig {
  title: string;
  description?: string;
  eyebrow?: string;
  footer?: string;
}

export function renderOgImage({ title, description, eyebrow, footer }: OgConfig) {
  const titleSize = title.length > 60 ? 56 : title.length > 40 ? 68 : 80;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0a0a",
        backgroundImage:
          "radial-gradient(circle at 25% 30%, rgba(198,254,30,0.18), transparent 55%), radial-gradient(circle at 75% 75%, rgba(158,232,71,0.10), transparent 55%)",
        padding: "72px 80px",
        fontFamily: "system-ui, sans-serif",
        color: "#fafafa",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <svg width="48" height="48" viewBox="0 0 43 42" fill="none">
          <path
            d="M21.0101 -0.00671387C9.40515 -0.00671387 -0.00317383 9.39863 -0.00317383 20.9998C-0.00317383 32.6011 9.40515 42.0064 21.0101 42.0064C32.615 42.0064 42.0233 32.6011 42.0233 20.9998C42.0233 9.39863 32.615 -0.00671387 21.0101 -0.00671387Z"
            fill="#C6FE1E"
          />
          <path
            d="M18.5025 15.5044H18.4885C17.62 15.2551 16.701 15.7537 16.4068 16.5771C16.0818 17.4622 16.5973 18.4761 17.5079 18.7562C19.7381 19.3892 20.6963 16.1934 18.5025 15.5044Z"
            fill="#0D0D0D"
          />
          <path
            d="M37.5098 20.0222C34.6379 13.7342 25.4762 16.3362 24.63 14.6893C22.1505 10.7989 17.522 8.61421 12.518 9.74016C11.7475 9.43207 9.09427 9.34804 7.37959 10.4264L8.41344 10.8829C8.49189 10.9165 8.46948 10.9081 8.58435 10.9501C9.05224 11.1266 8.97099 11.0762 8.63478 11.261C7.86429 11.712 6.90329 12.2357 6.30371 13.0228C6.32893 13.0592 7.62334 13.3701 7.62334 13.3701C7.64576 13.3757 7.88671 13.4009 7.83347 13.5073C3.60001 20.1902 10.7389 30.2762 14.2047 35.7043H24.2378C22.6884 32.9314 20.9177 29.1474 21.5229 26.579C21.6322 26.1141 21.7722 25.5231 22.3438 25.4447C23.7251 25.2234 25.5742 25.243 26.8911 25.0946C26.8911 25.0946 26.8976 25.0946 26.9107 25.0946C27.1909 25.0806 34.0496 24.2095 35.6914 28.4836C35.8315 28.8757 36.1537 28.6209 36.2826 28.3632C37.507 25.9292 38.2971 22.0976 37.5154 20.025L37.5098 20.0222ZM26.4372 17.9579C25.9553 18.8178 25.6275 19.9353 25.5434 20.9101C25.4986 21.529 25.563 22.1396 25.6247 22.7586C25.6583 23.1003 25.6611 23.5317 25.3865 23.7557C25.1484 23.9574 24.7533 23.977 24.3555 24.005C22.4026 23.9966 17.6396 24.005 15.8045 22.7558L15.7933 22.7474C13.1232 21.1201 11.6943 17.4454 13.2801 14.5913C13.7928 13.6222 14.737 12.992 15.8129 12.7539C17.197 12.4374 18.7211 12.6727 19.9567 13.3197C20.461 13.5746 21.0634 13.9107 21.5229 14.2972C22.4335 15.0926 23.2124 15.9189 24.4059 16.1738C24.9551 16.3306 25.5266 16.3082 26.0758 16.4202C27.104 16.6667 26.8462 17.2521 26.4344 17.9523L26.4372 17.9579Z"
            fill="#0D0D0D"
          />
        </svg>
        <span style={{ fontSize: 14, color: "#52525b", margin: "0 2px" }}>/</span>
        <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Dualmark
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {eyebrow ? (
          <div
            style={{
              fontSize: 18,
              fontFamily: "monospace",
              color: "#C6FE1E",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              fontSize: 26,
              color: "#a1a1aa",
              lineHeight: 1.4,
              maxWidth: 980,
            }}
          >
            {description}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 20,
          color: "#71717a",
          fontFamily: "monospace",
        }}
      >
        <span>{footer ?? "$ bun add @dualmark/astro"}</span>
        <span>dualmark.dev</span>
      </div>
    </div>,
    { ...OG_SIZE },
  );
}

const LEVEL_COLOR: Record<ScoreLevel, string> = {
  Advanced: "#4ade80",
  Standard: "#C6FE1E",
  Basic: "#fbbf24",
  "Below Basic": "#f87171",
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

interface ScoreOgConfig {
  url: string;
  score: number;
  maxScore: number;
}

export function renderScoreOgImage({ url, score, maxScore }: ScoreOgConfig) {
  const level = levelFromScore(score, maxScore);
  const color = LEVEL_COLOR[level];
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const percentage = Math.round(ratio * 100);
  const host = hostFromUrl(url);

  const r = 90;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - ratio);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0a0a",
        backgroundImage:
          "radial-gradient(circle at 25% 30%, rgba(198,254,30,0.18), transparent 55%), radial-gradient(circle at 75% 75%, rgba(158,232,71,0.10), transparent 55%)",
        padding: "72px 80px",
        fontFamily: "system-ui, sans-serif",
        color: "#fafafa",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <svg width="48" height="48" viewBox="0 0 43 42" fill="none">
          <path
            d="M21.0101 -0.00671387C9.40515 -0.00671387 -0.00317383 9.39863 -0.00317383 20.9998C-0.00317383 32.6011 9.40515 42.0064 21.0101 42.0064C32.615 42.0064 42.0233 32.6011 42.0233 20.9998C42.0233 9.39863 32.615 -0.00671387 21.0101 -0.00671387Z"
            fill="#C6FE1E"
          />
          <path
            d="M18.5025 15.5044H18.4885C17.62 15.2551 16.701 15.7537 16.4068 16.5771C16.0818 17.4622 16.5973 18.4761 17.5079 18.7562C19.7381 19.3892 20.6963 16.1934 18.5025 15.5044Z"
            fill="#0D0D0D"
          />
          <path
            d="M37.5098 20.0222C34.6379 13.7342 25.4762 16.3362 24.63 14.6893C22.1505 10.7989 17.522 8.61421 12.518 9.74016C11.7475 9.43207 9.09427 9.34804 7.37959 10.4264L8.41344 10.8829C8.49189 10.9165 8.46948 10.9081 8.58435 10.9501C9.05224 11.1266 8.97099 11.0762 8.63478 11.261C7.86429 11.712 6.90329 12.2357 6.30371 13.0228C6.32893 13.0592 7.62334 13.3701 7.62334 13.3701C7.64576 13.3757 7.88671 13.4009 7.83347 13.5073C3.60001 20.1902 10.7389 30.2762 14.2047 35.7043H24.2378C22.6884 32.9314 20.9177 29.1474 21.5229 26.579C21.6322 26.1141 21.7722 25.5231 22.3438 25.4447C23.7251 25.2234 25.5742 25.243 26.8911 25.0946C26.8911 25.0946 26.8976 25.0946 26.9107 25.0946C27.1909 25.0806 34.0496 24.2095 35.6914 28.4836C35.8315 28.8757 36.1537 28.6209 36.2826 28.3632C37.507 25.9292 38.2971 22.0976 37.5154 20.025L37.5098 20.0222ZM26.4372 17.9579C25.9553 18.8178 25.6275 19.9353 25.5434 20.9101C25.4986 21.529 25.563 22.1396 25.6247 22.7586C25.6583 23.1003 25.6611 23.5317 25.3865 23.7557C25.1484 23.9574 24.7533 23.977 24.3555 24.005C22.4026 23.9966 17.6396 24.005 15.8045 22.7558L15.7933 22.7474C13.1232 21.1201 11.6943 17.4454 13.2801 14.5913C13.7928 13.6222 14.737 12.992 15.8129 12.7539C17.197 12.4374 18.7211 12.6727 19.9567 13.3197C20.461 13.5746 21.0634 13.9107 21.5229 14.2972C22.4335 15.0926 23.2124 15.9189 24.4059 16.1738C24.9551 16.3306 25.5266 16.3082 26.0758 16.4202C27.104 16.6667 26.8462 17.2521 26.4344 17.9523L26.4372 17.9579Z"
            fill="#0D0D0D"
          />
        </svg>
        <span style={{ fontSize: 14, color: "#52525b", margin: "0 2px" }}>
          /
        </span>
        <span
          style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          Dualmark
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "48px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: 18,
              fontFamily: "monospace",
              color: "#C6FE1E",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            AEO Spec v1.0
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              maxWidth: 640,
            }}
          >
            {host}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              borderRadius: 999,
              border: `2px solid ${color}`,
              color,
              padding: "10px 22px",
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            {level} · {percentage}%
          </div>
        </div>

        <div
          style={{
            display: "flex",
            position: "relative",
            width: 220,
            height: 220,
          }}
        >
          <svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx="110"
              cy="110"
              r={r}
              fill="none"
              stroke="#27272a"
              strokeWidth="16"
            />
            <circle
              cx="110"
              cy="110"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 220,
              height: 220,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 72, fontWeight: 700, color }}>
              {score}
            </span>
            <span
              style={{
                fontSize: 26,
                color: "#71717a",
                fontFamily: "monospace",
              }}
            >
              / {maxScore}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 20,
          color: "#71717a",
          fontFamily: "monospace",
        }}
      >
        <span>$ dualmark verify {host}</span>
        <span>dualmark.dev/play</span>
      </div>
    </div>,
    { ...OG_SIZE },
  );
}
