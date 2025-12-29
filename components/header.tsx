"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Latest" },
    { href: "/all", label: "All Articles" },
    { href: "/clusters", label: "Clusters" },
    { href: "/sources", label: "Sources" },
    { href: "/logs", label: "Logs" },
  ];

  return (
    <header className="sticky top-0 z-50 h-12 border-b border-border bg-background">
      <div className="container mx-auto px-4 h-full flex items-center">
        <nav className="flex gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
