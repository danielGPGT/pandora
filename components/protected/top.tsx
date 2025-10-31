"use client";

import { Bell, Search, Sparkles } from "lucide-react";
import Link from "next/link";

export function Top() {
  return (
    <header className="sticky top-0 z-20 bg-primary backdrop-blur ">
      <div className="p-0 md:px-6 flex items-center justify-between w-full">
        <div className="flex items-center justify-center gap-2 w-full ">
          <p className="text-sm text-background text-center">This app is in development. Do not use for production. And is being built to be a SaaS application for tour operators for inventory, quotes, bookings, and operations.</p>
        </div>
      </div>
    </header>
  );
}