import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-primary">
            CVOptimizador
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/signin"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/upload"
              className={cn(
                "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              Empezar gratis
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Optimizá tu CV para los{" "}
            <span className="text-primary">filtros ATS</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            El 75% de los CVs son rechazados por sistemas automáticos antes de
            llegar a un humano. Usamos IA para optimizar tu currículum y
            aumentar tus chances de conseguir entrevistas.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/upload"
              className={cn(
                "rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              Analizar mi CV gratis
            </Link>
            <Link
              href="#como-funciona"
              className={cn(
                "rounded-md border border-border px-8 py-3 text-base font-medium",
                "hover:bg-secondary transition-colors"
              )}
            >
              ¿Cómo funciona?
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section id="como-funciona" className="border-t border-border bg-secondary/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold">
              ¿Cómo funciona?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              En 3 simples pasos, tu CV estará optimizado para pasar los filtros
              automáticos
            </p>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <Step
                number={1}
                title="Subí tu CV"
                description="Cargá tu currículum en formato PDF y pegá la descripción del puesto al que querés aplicar."
              />
              <Step
                number={2}
                title="Análisis con IA"
                description="Nuestra IA analiza tu CV contra la descripción del puesto y calcula tu puntaje ATS actual."
              />
              <Step
                number={3}
                title="CV Optimizado"
                description="Recibí tu CV optimizado con las palabras clave correctas para maximizar tu puntaje."
              />
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold">
              ¿Por qué usar CVOptimizador?
            </h2>

            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <Benefit
                title="Análisis instantáneo"
                description="Resultados en segundos, no días. Sabé exactamente qué mejorar."
              />
              <Benefit
                title="Palabras clave ATS"
                description="Identificamos las keywords que los sistemas buscan en tu industria."
              />
              <Benefit
                title="Score antes/después"
                description="Visualizá el impacto de las optimizaciones en tu puntaje ATS."
              />
              <Benefit
                title="Primera prueba gratis"
                description="Probá el servicio sin costo. Solo pagás si querés el CV optimizado."
              />
              <Benefit
                title="Específico por puesto"
                description="Optimización personalizada para cada oferta laboral."
              />
              <Benefit
                title="Formato profesional"
                description="PDF limpio y profesional, listo para enviar."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-primary/5 py-20">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-3xl font-bold">
              Empezá a optimizar tu CV ahora
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Tu primera optimización es gratis. Descargá el CV optimizado por
              solo $2.990 CLP.
            </p>
            <Link
              href="/upload"
              className={cn(
                "mt-8 inline-block rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              Analizar mi CV gratis
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 CVOptimizador. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
        {number}
      </div>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}

function Benefit({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
