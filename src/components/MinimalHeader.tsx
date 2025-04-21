'use client';

import Link from 'next/link';

export function MinimalHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 md:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" aria-label="Back to journal">
          <img 
            src="https://s3.ca-central-1.amazonaws.com/logojoy/logos/218272791/noBgBlack.png?865367" 
            alt="VibeKeep Logo" 
            className="h-8 w-auto" // Adjusted size slightly
          />
          {/* Optional: Add text title next to logo if desired */}
          {/* <span className="font-semibold text-lg">VibeKeep</span> */}
        </Link>
        
        {/* Back Link */}
        <Link href="/" passHref>
           <span className="text-sm font-medium text-primary hover:underline">
              &larr; Back to Main
           </span> 
        </Link>
      </div>
    </header>
  );
} 