import Image from "next/image";
import Link from "next/link";
import { getSourceByName } from "@/lib/sources";

export interface MediaSourceLinkProps {
  /** Display name of the source (used to lookup logo and URL from sources config) */
  name: string;
  /** Size variant */
  size?: "small" | "medium";
  /** Additional CSS classes */
  className?: string;
}

const sizeConfig = {
  small: {
    logoSize: 20,
    fontSize: "text-xs",
    gap: "gap-1.5",
  },
  medium: {
    logoSize: 24,
    fontSize: "text-sm",
    gap: "gap-2",
  },
} as const;

/**
 * Reusable component to display a media source with logo and name
 */
export function MediaSourceLink({
  name,
  size = "small",
  className = "",
}: MediaSourceLinkProps) {
  const source = getSourceByName(name);
  const config = sizeConfig[size];

  const innerContent = (
    <>
      {source?.logo && (
        <Image
          src={source.logo}
          alt={`Logo ${name}`}
          width={config.logoSize}
          height={config.logoSize}
          className="rounded object-contain"
        />
      )}
      <span>{name}</span>
    </>
  );

  if (source?.baseUrl) {
    return (
      <div className={className}>
        <Link
          href={source.baseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center ${config.gap} ${config.fontSize} text-black hover:text-gray-600 transition-colors no-underline`}
        >
          {innerContent}
        </Link>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center ${config.gap} ${config.fontSize} text-black ${className}`}
    >
      {innerContent}
    </span>
  );
}
