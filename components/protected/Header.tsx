"use client";

import { Bell, Mail, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/protected/theme-toggle";
import { useUser } from "@/lib/hooks/use-user";
import { Button } from "../ui/button";

export function Header() {
  const { user, loading } = useUser();

  const hasProfile = Boolean(user?.first_name || user?.last_name);
  const fullName = hasProfile ? `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() : undefined;
  const displayName = user
    ? fullName && fullName.length > 0
      ? fullName
      : user.email
    : loading
    ? "Loading…"
    : "User";
  const email = user?.email ?? "";

  return (
    <header className="sticky top-0 z-40 bg-sidebar">
      <div className=" px-2 py-2 flex items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              placeholder="Search task"
              className="pl-9 pr-16 bg-background/80 shadow-sm"
              aria-label="Search"
            />
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-full px-2 py-1">
              <kbd className="font-medium">⌘</kbd>
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Messages">
            <Mail className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          </div>
          <div className="flex items-center gap-2 pr-2">
            <Avatar className="h-10 w-10">
              {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={displayName} /> : null}
              <AvatarFallback>{(fullName?.charAt(0) ?? user?.email?.charAt(0) ?? "U").toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="text-[11px] text-muted-foreground">{email}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
