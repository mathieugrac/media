interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="border-b border-border py-6">
      <div className="container mx-auto px-4">
        <h1 className={`text-3xl font-bold ${description ? "mb-1" : ""}`}>
          {title}
        </h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
    </header>
  );
}
