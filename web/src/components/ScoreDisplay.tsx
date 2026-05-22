"use client";

import { cn } from "@/lib/utils";

interface ScoreDisplayProps {
  scoreBefore: number;
  scoreAfter: number;
  className?: string;
}

export function ScoreDisplay({ scoreBefore, scoreAfter, className }: ScoreDisplayProps) {
  const improvement = scoreAfter - scoreBefore;
  const improvementPercent = scoreBefore > 0 ? Math.round((improvement / scoreBefore) * 100) : 0;

  return (
    <div className={cn("rounded-lg border border-border bg-card p-6", className)}>
      <h3 className="text-lg font-semibold">Puntaje ATS</h3>
      
      <div className="mt-6 flex items-center justify-center gap-8">
        {/* Before Score */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Antes</div>
          <ScoreCircle score={scoreBefore} variant="before" />
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center">
          <svg
            className="h-8 w-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
          <span className="mt-1 text-sm font-medium text-primary">
            +{improvement} pts
          </span>
        </div>

        {/* After Score */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Después</div>
          <ScoreCircle score={scoreAfter} variant="after" />
        </div>
      </div>

      {/* Improvement Summary */}
      <div className="mt-6 rounded-lg bg-primary/5 px-4 py-3 text-center">
        <p className="text-sm">
          Tu CV mejoró un{" "}
          <span className="font-bold text-primary">{improvementPercent}%</span> su compatibilidad
          con el puesto
        </p>
      </div>
    </div>
  );
}

function ScoreCircle({ score, variant }: { score: number; variant: "before" | "after" }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const colorClass = variant === "before" 
    ? getScoreColor(score, "muted") 
    : getScoreColor(score, "primary");

  return (
    <div className="relative mt-2 h-32 w-32">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          className={cn("transition-all duration-1000", colorClass)}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference - progress,
          }}
        />
      </svg>
      {/* Score number */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-3xl font-bold", colorClass)}>{score}</span>
      </div>
    </div>
  );
}

function getScoreColor(score: number, variant: "primary" | "muted"): string {
  if (variant === "muted") {
    return "text-muted-foreground";
  }
  
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-yellow-600";
  return "text-destructive";
}
