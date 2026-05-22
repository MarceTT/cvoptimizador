"use client";

import { cn } from "@/lib/utils";

interface KeywordListProps {
  keywordsAdded: string[];
  keywordsMissing: string[];
  className?: string;
}

export function KeywordList({ keywordsAdded, keywordsMissing, className }: KeywordListProps) {
  const hasAdded = keywordsAdded.length > 0;
  const hasMissing = keywordsMissing.length > 0;

  return (
    <div className={cn("rounded-lg border border-border bg-card p-6", className)}>
      <h3 className="text-lg font-semibold">Palabras Clave</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Keywords que buscan los sistemas ATS para este puesto
      </p>

      <div className="mt-6 space-y-6">
        {/* Keywords Added */}
        <div>
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">
              Agregadas ({keywordsAdded.length})
            </span>
          </div>
          {hasAdded ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {keywordsAdded.map((keyword) => (
                <KeywordTag key={keyword} keyword={keyword} variant="added" />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No se agregaron keywords nuevas
            </p>
          )}
        </div>

        {/* Keywords Missing */}
        <div>
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">
              Faltantes ({keywordsMissing.length})
            </span>
          </div>
          {hasMissing ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {keywordsMissing.map((keyword) => (
                <KeywordTag key={keyword} keyword={keyword} variant="missing" />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              ¡Tu CV tiene todas las keywords importantes!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function KeywordTag({
  keyword,
  variant,
}: {
  keyword: string;
  variant: "added" | "missing";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variant === "added"
          ? "bg-green-100 text-green-800"
          : "bg-destructive/10 text-destructive"
      )}
    >
      {variant === "added" && (
        <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {keyword}
    </span>
  );
}
