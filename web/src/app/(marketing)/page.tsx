import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Sparkles,
  Download,
  CheckCircle2,
  Target,
  Zap,
  Shield,
  TrendingUp,
  FileText,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CVOptimizador</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/signin">Iniciar sesión</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/upload">
                Empezar gratis
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
          
          <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-6">
                <Sparkles className="mr-1.5 h-3 w-3" />
                Potenciado por IA
              </Badge>
              
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Optimizá tu CV para los{" "}
                <span className="gradient-text">filtros ATS</span>
              </h1>
              
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                El 75% de los CVs son rechazados automáticamente. 
                Nuestra IA analiza tu currículum y lo optimiza con las 
                palabras clave exactas que buscan los reclutadores.
              </p>
              
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="xl" asChild>
                  <Link href="/upload">
                    <Upload className="mr-2 h-5 w-5" />
                    Analizar mi CV gratis
                  </Link>
                </Button>
                <Button variant="outline" size="xl" asChild>
                  <Link href="#como-funciona">
                    ¿Cómo funciona?
                  </Link>
                </Button>
              </div>
              
              <p className="mt-6 text-sm text-muted-foreground">
                ✓ Primera optimización gratis · ✓ Resultados en 30 segundos · ✓ Sin tarjeta requerida
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <Stat value="8.3%" label="Desempleo en Chile" />
              <Stat value="87%" label="Busca trabajo online" />
              <Stat value="75%" label="CVs rechazados por ATS" />
              <Stat value="30s" label="Tiempo de optimización" />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="como-funciona" className="py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Proceso simple</Badge>
              <h2 className="text-3xl font-bold sm:text-4xl">
                ¿Cómo funciona?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                En 3 simples pasos, tu CV estará optimizado para pasar los filtros automáticos
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <StepCard
                number={1}
                icon={Upload}
                title="Subí tu CV"
                description="Cargá tu currículum en PDF y pegá la descripción del puesto al que querés aplicar."
              />
              <StepCard
                number={2}
                icon={Sparkles}
                title="Análisis con IA"
                description="Nuestra IA analiza tu CV contra la oferta y calcula tu puntaje ATS actual."
              />
              <StepCard
                number={3}
                icon={Download}
                title="CV Optimizado"
                description="Descargá tu CV optimizado con las palabras clave correctas para esa oferta."
              />
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-t border-border bg-muted/30 py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Beneficios</Badge>
              <h2 className="text-3xl font-bold sm:text-4xl">
                ¿Por qué CVOptimizador?
              </h2>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <BenefitCard
                icon={Zap}
                title="Análisis instantáneo"
                description="Resultados en 30 segundos. Sabé exactamente qué mejorar en tu CV."
              />
              <BenefitCard
                icon={Target}
                title="Palabras clave ATS"
                description="Identificamos las keywords exactas que los sistemas buscan en tu industria."
              />
              <BenefitCard
                icon={TrendingUp}
                title="Score antes/después"
                description="Visualizá el impacto real de las optimizaciones en tu puntaje ATS."
              />
              <BenefitCard
                icon={Shield}
                title="Primera prueba gratis"
                description="Probá el análisis sin costo. Solo pagás si querés el CV optimizado."
              />
              <BenefitCard
                icon={FileText}
                title="Específico por puesto"
                description="Optimización personalizada para cada oferta laboral a la que postulés."
              />
              <BenefitCard
                icon={CheckCircle2}
                title="Formato profesional"
                description="PDF limpio y profesional, diseñado para pasar filtros ATS."
              />
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="py-24">
          <div className="mx-auto max-w-6xl px-4">
            <Card className="overflow-hidden">
              <div className="grid md:grid-cols-2">
                <CardContent className="flex flex-col justify-center p-8 md:p-12">
                  <Badge variant="success" className="w-fit mb-4">
                    Oferta de lanzamiento
                  </Badge>
                  <h2 className="text-3xl font-bold">
                    Empezá a optimizar tu CV ahora
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Tu primera optimización es completamente gratis. 
                    Descargá el CV optimizado por solo $2.990 CLP.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Análisis completo gratuito
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Score ATS antes y después
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Palabras clave identificadas
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      PDF optimizado descargable
                    </li>
                  </ul>
                  <Button size="xl" className="mt-8 w-fit" asChild>
                    <Link href="/upload">
                      Analizar mi CV gratis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
                <div className="relative hidden md:block">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">CV Optimizado</p>
                      <p className="mt-2 text-5xl font-bold">$2.990</p>
                      <p className="text-muted-foreground">CLP</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">CVOptimizador</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 CVOptimizador. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function StepCard({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-8 pb-6 px-6">
        <div className="absolute -right-4 -top-4 text-[120px] font-bold text-muted/20 leading-none">
          {number}
        </div>
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-xl font-semibold">{title}</h3>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
