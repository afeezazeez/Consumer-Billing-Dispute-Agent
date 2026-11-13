interface GmailBrandIconProps {
  className: string;
}

export function GmailBrandIcon({ className }: GmailBrandIconProps) {
  return (
    <span aria-hidden="true" className={className}>
      <svg viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="gmail-logo-left" x1="7" y1="12" x2="7" y2="39" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF5A8B" />
            <stop offset="0.48" stopColor="#EA4335" />
            <stop offset="1" stopColor="#EA4335" />
          </linearGradient>
          <linearGradient id="gmail-logo-right" x1="24" y1="25" x2="42" y2="25" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EA4335" />
            <stop offset="0.45" stopColor="#FBBC04" />
            <stop offset="0.7" stopColor="#34A853" />
            <stop offset="1" stopColor="#4285F4" />
          </linearGradient>
        </defs>
        <path d="M7 13 24 27" stroke="#EA4335" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 13V38" stroke="url(#gmail-logo-left)" strokeWidth="8" strokeLinecap="round" />
        <path d="M24 27 41 13V38" stroke="url(#gmail-logo-right)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
