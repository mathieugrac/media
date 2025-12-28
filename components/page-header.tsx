import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
  titleClassName?: string;
}

export function PageHeader({
  title,
  description,
  action,
  titleClassName,
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
        {action && <div>{action}</div>}
      </div>
    </header>
  );
}
