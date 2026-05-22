"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ScoreDisplayProps {
  scoreBefore: number;
  scoreAfter: number;
  className?: string;
}

export function ScoreDisplay({ scoreBefore, scoreAfter, className }: ScoreDisplayProps) {
  const improvement = scoreAfter - scoreBefore;
  const improvementPercent = scoreBefore > 0 
    ? Math.round((improvement / scoreBefore) * 100) 
    : scoreAfter > 0 ? 100 : 0;

  return (
    <div className={cn("grid gap-6 sm:grid-cols-3", className)}>
      {/* Before Score */}
      <ScoreCircle
        label="Antes"
        score={scoreBefore}
        variant="muted"
      />

      {/* Improvement */}
      <div className="flex flex-col items-center justify-center">
        <div className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
          improvement > 0 
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : improvement < 0
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : "bg-muted text-muted-foreground"
        )}>
          {improvement > 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : improvement < 0 ? (
            <TrendingDown className="h-4 w-4" />
          ) : (
            <Minus className="h-4 w-4" />
          )}
          {improvement > 0 ? "+" : ""}{improvement} puntos
        </div>
        {improvementPercent > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            +{improvementPercent}% de mejora
          </p>
        )}
      </div>

      {/* After Score */}
      <ScoreCircle
        label="Después"
        score={scoreAfter}
        variant="primary"
      />
    </div>
  );
}

interface ScoreCircleProps {
  label: string;
  score: number;
  variant: "primary" | "muted";
}

function ScoreCircle({ label, score, variant }: ScoreCircleProps) {
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (score: number, variant: "primary" | "muted") => {
    if (variant === "muted") {
      if (score >= 70) return "text-green-400";
      if (score >= 50) return "text-yellow-400";
      return "text-red-400";
    }
    if (score >= 70) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getStrokeColor = (score: number, variant: "primary" | "muted") => {
    if (variant === "muted") {
      if (score >= 70) return "stroke-green-300";
      if (score >= 50) return "stroke-yellow-300";
      return "stroke-red-300";
    }
    if (score >= 70) return "stroke-green-500";
    if (score >= 50) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  return (
    <div className="flex flex-col items-center">
      <p className="mb-3 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="relative">
        <svg
          className="h-28 w-28 -rotate-90 transform"
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            className={variant === "muted" ? "stroke-muted" : "stroke-muted/50"}
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn("transition-all duration-1000", getStrokeColor(score, variant))}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "text-3xl font-bold",
            getScoreColor(score, variant)
          )}>
            {score}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {score >= 70 ? "Excelente" : score >= 50 ? "Mejorable" : "Bajo"}
      </p>
    </div>
  );
}
