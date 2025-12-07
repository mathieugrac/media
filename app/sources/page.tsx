import { MEDIA_SOURCES } from "@/lib/data/sources";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function SourcesPage() {
  // Get all enabled sources and sort alphabetically
  const sources = MEDIA_SOURCES.filter((s) => s.enabled).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Sources"
        description={`${sources.length} médias indépendants français sélectionnés`}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <Card
              key={source.id}
              className="hover:shadow-md transition-shadow gap-1 p-4"
            >
              <CardHeader className="gap-1 px-0">
                <CardTitle>
                  <Link
                    href={source.baseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:underline pt-1"
                  >
                    {source.name}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <p className="text-sm text-primary">{source.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
