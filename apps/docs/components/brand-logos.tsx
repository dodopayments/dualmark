import type { SVGProps } from "react";

interface LogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function AstroLogo({ size = 24, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Astro"
      {...props}
    >
      <path
        d="M81.504 9.465c.973 1.207 1.469 2.836 2.457 6.09l21.656 71.136a90.079 90.079 0 0 0-25.89-8.765L65.629 30.806a.913.913 0 0 0-1.754.003L49.882 77.902a90.084 90.084 0 0 0-26.003 8.778l21.762-71.156c.992-3.246 1.488-4.871 2.46-6.074a8 8 0 0 1 3.235-2.398c1.42-.575 3.121-.575 6.519-.575H71.75c3.402 0 5.105 0 6.527.578a7.99 7.99 0 0 1 3.227 2.41Zm0 0"
        fill="currentColor"
      />
      <path
        d="M85.273 89.305c-3.578 3.062-10.722 5.152-18.95 5.152-10.097 0-18.558-3.149-20.808-7.385-.805 2.425-.985 5.2-.985 6.975 0 0-.53 8.713 5.527 14.77a5.522 5.522 0 0 1 5.522-5.521c5.255 0 5.249 4.586 5.244 8.305v.332c0 5.645 3.451 10.483 8.358 12.522a11.396 11.396 0 0 1-1.144-4.997c0-5.392 3.165-7.4 6.844-9.735 2.925-1.857 6.175-3.92 8.41-8.063a15.158 15.158 0 0 0 1.84-7.265c0-1.71-.281-3.353-.798-4.886Zm0 0"
        fill="#FF5D01"
      />
    </svg>
  );
}

export function NextLogo({ size = 24, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Next.js"
      {...props}
    >
      <circle cx="90" cy="90" r="90" fill="black" />
      <path
        d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z"
        fill="url(#next-paint0)"
      />
      <rect x="115" y="54" width="12" height="72" fill="url(#next-paint1)" />
      <defs>
        <linearGradient
          id="next-paint0"
          x1="109"
          y1="116.5"
          x2="144.5"
          y2="160.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="next-paint1"
          x1="121"
          y1="54"
          x2="120.799"
          y2="106.875"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function CloudflareLogo({ size = 24, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cloudflare"
      {...props}
    >
      <path
        d="M44.176 31.787a1.39 1.39 0 0 0 .985-1.71.998.998 0 0 0-.92-.708l-19.16-.245a.388.388 0 0 1-.305-.16.394.394 0 0 1-.04-.346.518.518 0 0 1 .451-.343l19.345-.245c2.293-.106 4.78-1.96 5.65-4.224l1.103-2.872a.605.605 0 0 0 .04-.327c-1.232-5.598-6.215-9.766-12.166-9.766-5.475 0-10.13 3.539-11.802 8.451a5.586 5.586 0 0 0-3.928-1.085c-2.673.265-4.82 2.42-5.084 5.097a5.802 5.802 0 0 0 .142 1.978c-4.358.131-7.847 3.715-7.847 8.117 0 .392.027.785.083 1.171.025.187.183.328.37.328h36.225c.205 0 .388-.146.448-.347l.41-1.413v-.353Z"
        fill="#F38020"
      />
      <path
        d="M51.013 23.087c-.176 0-.351.005-.527.015a.183.183 0 0 0-.157.131l-.751 2.6c-.327 1.13-.207 2.171.343 2.937.504.706 1.305 1.13 2.327 1.18l4.084.244a.517.517 0 0 1 .305.16.39.39 0 0 1 .04.347.519.519 0 0 1-.45.343l-4.245.245c-2.305.106-4.78 1.96-5.65 4.224l-.305.804a.235.235 0 0 0 .218.317h14.611c.197 0 .375-.13.435-.317.303-1.026.46-2.087.46-3.155 0-5.79-4.694-10.475-10.488-10.475"
        fill="#FAAE40"
      />
    </svg>
  );
}

export function FastlyLogo({ size = 24, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Fastly"
      {...props}
    >
      <path
        d="M12 16h40v8H33.5L28 32l5.5 8H52v8H12v-8h12.5l-5.5-8 5.5-8H12z"
        fill="currentColor"
      />
    </svg>
  );
}

export function WrenchLogo({ size = 24, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Manual integration"
      {...props}
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
