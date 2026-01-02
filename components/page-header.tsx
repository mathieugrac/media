import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
  titleClassName?: string;
  mobileActionPortalId?: string;
}

export function PageHeader({
  title,
  description,
  action,
  titleClassName,
  mobileActionPortalId,
}: PageHeaderProps) {
  return (
    <header className="border-b border-border py-6">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div>
          <h1
            className={`text-3xl font-bold ${description ? "mb-1" : ""} ${
              titleClassName ?? ""
            }`}
          >
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Portal target for mobile actions */}
          {mobileActionPortalId && (
            <div id={mobileActionPortalId} className="md:hidden" />
          )}
          {action && <div>{action}</div>}
        </div>
      </div>
    </header>
  );
}
