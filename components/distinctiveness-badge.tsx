/**
 * Distinctiveness Badge Component
 * 
 * Displays a visual badge indicating an article's unique angle.
 * 
 * Badges:
 * - 🔴 Exclusivité - Major scoop, exclusive info
 * - 🟠 Angle unique - Fresh perspective
 * - 🟣 Investigation - Deep investigative work
 * - 🟢 Voix alternatives - Underrepresented perspectives
 * - 🔵 Mise en contexte - Valuable historical/systemic context
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DistinctivenessBadge as BadgeType } from "@/lib/distinctiveness";

interface DistinctivenessBadgeProps {
  badge: BadgeType;
  label: string | null;
  score: number;
  uniqueElements?: string[];
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BADGE_STYLES: Record<BadgeType & string, { bg: string; text: string; border: string }> = {
  'exclusive': {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  'unique-angle': {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  'deep-dive': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  'alternative': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  'context': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function DistinctivenessBadge({
  badge,
  label,
  score,
  uniqueElements = [],
  showTooltip = true,
  size = "sm",
  className,
}: DistinctivenessBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  if (!badge || !label) {
    return null;
  }
  
  const styles = BADGE_STYLES[badge];
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border font-medium",
          "transition-all duration-200 cursor-help",
          styles.bg,
          styles.text,
          styles.border,
          SIZE_CLASSES[size],
          isHovered && "ring-2 ring-offset-1 ring-offset-background",
          isHovered && styles.border.replace('/30', '/50'),
          className
        )}
      >
        {label}
      </span>
      
      {/* Tooltip */}
      {showTooltip && isHovered && (
        <div 
          className={cn(
            "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2",
            "w-64 p-3 rounded-lg shadow-xl",
            "bg-zinc-900 border border-zinc-700",
            "text-sm text-zinc-200",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={cn("font-semibold", styles.text)}>{label}</span>
            <span className="text-xs text-zinc-400">Score: {score}/100</span>
          </div>
          
          {uniqueElements.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 uppercase tracking-wider">
                Ce qui rend cet article unique:
              </p>
              <ul className="text-xs text-zinc-300 space-y-0.5">
                {uniqueElements.map((el, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className={styles.text}>•</span>
                    <span>{el}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Arrow */}
          <div 
            className={cn(
              "absolute top-full left-1/2 -translate-x-1/2",
              "w-0 h-0 border-l-8 border-r-8 border-t-8",
              "border-l-transparent border-r-transparent border-t-zinc-700"
            )}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Compact badge for use in lists
 */
export function DistinctivenessBadgeCompact({
  badge,
  className,
}: {
  badge: BadgeType;
  className?: string;
}) {
  if (!badge) return null;
  
  const styles = BADGE_STYLES[badge];
  
  const ICONS: Record<BadgeType & string, string> = {
    'exclusive': '🔴',
    'unique-angle': '🟠',
    'deep-dive': '🟣',
    'alternative': '🟢',
    'context': '🔵',
  };
  
  return (
    <span 
      className={cn(
        "inline-block text-sm",
        className
      )}
      title={badge}
    >
      {ICONS[badge]}
    </span>
  );
}

/**
 * Score bar visualization
 */
export function DistinctivenessScoreBar({
  score,
  label,
  className,
}: {
  score: number;
  label: string;
  className?: string;
}) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 65) return 'bg-orange-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 35) return 'bg-blue-500';
    return 'bg-zinc-500';
  };
  
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300">{score}</span>
      </div>
      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

