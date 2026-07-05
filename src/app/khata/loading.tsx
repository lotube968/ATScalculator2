'use client';
import { AppLogo } from "@/components/ui/app-logo";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <AppLogo className="h-24 w-24 text-primary animate-pulse" />
        <div className="jumping-dots flex gap-2">
          <div className="dot dot-1"></div>
          <div className="dot dot-2"></div>
          <div className="dot dot-3"></div>
        </div>
      </div>
    </div>
  );
}
