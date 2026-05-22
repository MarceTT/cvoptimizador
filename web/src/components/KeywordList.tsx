"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Plus } from "lucide-react";

interface KeywordListProps {
  title: string;
  keywords: string[];
  variant: "added" | "missing" | "existing";
  className?: string;
}

export function KeywordList({ title, keywords, variant, className }: KeywordListProps) {
  if (keywords.length === 0) {
    return null;
  }

  const Icon = variant === "added" 
    ? Plus 
    : variant === "existing" 
    ? CheckCircle2 
    : XCircle;

  const badgeVariant = variant === "added" 
    ? "success" 
    : variant === "existing" 
    ? "secondary" 
    : "destructive";

  const iconColor = variant === "added"
    ? "text-green-600"
    : variant === "existing"
    ? "text-muted-foreground"
    : "text-red-500";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconColor)} />
        <h3 className="font-medium">{title}</h3>
        <Badge variant="outline" className="ml-auto">
          {keywords.length}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <Badge key={index} variant={badgeVariant}>
            {keyword}
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface KeywordComparisonProps {
  keywordsAdded: string[];
  keywordsExisting: string[];
  keywordsMissing?: string[];
  className?: string;
}

export function KeywordComparison({
  keywordsAdded,
  keywordsExisting,
  keywordsMissing = [],
  className,
}: KeywordComparisonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <KeywordList
        title="Keywords agregadas"
        keywords={keywordsAdded}
        variant="added"
      />
      <KeywordList
        title="Keywords que ya tenías"
        keywords={keywordsExisting}
        variant="existing"
      />
      {keywordsMissing.length > 0 && (
        <KeywordList
          title="Keywords que faltan"
          keywords={keywordsMissing}
          variant="missing"
        />
      )}
    </div>
  );
}
