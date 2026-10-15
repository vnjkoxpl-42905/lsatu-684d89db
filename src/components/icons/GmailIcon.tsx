import type { SVGProps } from 'react';

/** Official multi-color Gmail logo. */
export function GmailIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 256 193" className={className} aria-hidden="true" focusable="false" {...props}>
      <path fill="#4285F4" d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455z" />
      <path fill="#34A853" d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837-27.026 25.798z" />
      <path fill="#EA4335" d="M58.182 93.14L54.027 54.65l4.155-36.746L128 69.868l69.818-51.964 4.65 33.728-4.65 41.508L128 145.104z" />
      <path fill="#FBBC04" d="M197.818 17.904V93.14L256 49.504V26.74c0-21.106-24.1-33.144-40.96-20.48z" />
      <path fill="#C5221F" d="M0 49.504l26.759 20.07L58.182 93.14V17.904L40.96 6.26C24.073-6.404 0 5.634 0 26.74z" />
    </svg>
  );
}
