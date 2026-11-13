import type { SVGProps } from 'react';

export function BikeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 17.5V14l-3-3 4-3 2 3h2" />
    </svg>
  );
}

export function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function SmallIcon({ d, ...props }: SVGProps<SVGSVGElement> & { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={d} />
    </svg>
  );
}

export const RemoveIcon = (props: SVGProps<SVGSVGElement>) => (
  <SmallIcon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" {...props} />
);

export const ResetIcon = (props: SVGProps<SVGSVGElement>) => (
  <SmallIcon d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" {...props} />
);

export const OkIcon = (props: SVGProps<SVGSVGElement>) => <SmallIcon d="M20 6 9 17l-5-5" {...props} />;

export const TightIcon = (props: SVGProps<SVGSVGElement>) => (
  <SmallIcon d="M12 3 2 21h20L12 3zM12 10v4M12 17.5v.5" {...props} />
);

export const EarlyIcon = (props: SVGProps<SVGSVGElement>) => (
  <SmallIcon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" {...props} />
);

export const LateIcon = (props: SVGProps<SVGSVGElement>) => (
  <SmallIcon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9l-6 6M9 9l6 6" {...props} />
);
