export function TrustShield({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 4L8 10v12c0 10.5 6.8 20.3 16 22 9.2-1.7 16-11.5 16-22V10L24 4z"
        fill="#48FF91"
      />
      <path
        d="M24 8.5L12 13v9.5c0 8.2 5.3 15.9 12 17.3 6.7-1.4 12-9.1 12-17.3V13L24 8.5z"
        fill="#0B0B0C"
      />
      <path
        d="M24 14l-6 2.5v6.5c0 4.5 2.9 8.7 6 9.5 3.1-.8 6-5 6-9.5v-6.5L24 14z"
        fill="#48FF91"
      />
    </svg>
  );
}
