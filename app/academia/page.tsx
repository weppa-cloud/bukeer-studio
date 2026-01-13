import { AcademyHero } from "@/components/site/academy-hero";
import { AcademyForm } from "@/components/site/academy-form";
import { ModuleCard } from "@/components/site/module-card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

// Mock Data for Syllabus
const modules = [
    {
        number: 1,
        title: "Centralización",
        description: "Aprende a unificar tus datos dispersos (WhatsApp, Email, Drive) en una única fuente de verdad. Diferencia entre contactos y leads cualificados.",
        duration: "45 min",
        lessons: 3
    },
    {
        number: 2,
        title: "Estandarización",
        description: "Anatomía de una cotización perfecta. Deja de copiar y pegar errores y crea plantillas maestras que venden por ti.",
        duration: "1h 10m",
        lessons: 3
    },
    {
        number: 3,
        title: "Seguimiento",
        description: "El dinero está en el follow-up. Diseña un pipeline de ventas simple para recuperar el 80% de ventas que pierdes por olvido.",
        duration: "50 min",
        lessons: 3
    },
    {
        number: 4,
        title: "Finanzas",
        description: "No operes a ciegas. Controla ingresos vs flujo de caja y aprende a conciliar pagos a proveedores y comisiones.",
        duration: "55 min",
        lessons: 3
    }
];

export const metadata = {
    title: "Bukeer Academy - Rompe tu Excel",
    description: "Curso gratuito para agencias de viajes. Aprende a sistematizar tu negocio.",
};

export default function AcademyPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Simple Navbar for Academy */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="container px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="font-bold text-xl tracking-tight text-slate-900">
                        Bukeer <span className="text-emerald-600">Academy</span>
                    </Link>
                    <nav className="hidden md:flex gap-6">
                        <Link href="#temario" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Temario</Link>
                        <Link href="#recursos" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Recursos</Link>
                    </nav>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        Acceso Alumnos
                    </Button>
                </div>
            </header>

            <main className="flex-1">
                <AcademyHero />

                {/* Syllabus Section */}
                <section id="temario" className="py-20 lg:py-32 bg-white">
                    <div className="container px-4 md:px-6 mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-slate-900">
                                Lo que aprenderás
                            </h2>
                            <p className="mt-4 text-slate-600 md:text-lg max-w-2xl mx-auto">
                                Un sistema paso a paso para dejar atrás el trabajo manual y construir una agencia escalable.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {modules.map((module) => (
                                <ModuleCard
                                    key={module.number}
                                    {...module}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Lead Magnet Section */}
                <section id="recursos" className="py-20 bg-slate-900 text-white">
                    <div className="container px-4 md:px-6 mx-auto">
                        <div className="grid gap-12 lg:grid-cols-2 items-center">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-6">
                                    Descarga la <span className="text-emerald-400">Calculadora de ROI</span>
                                </h2>
                                <p className="text-slate-300 text-lg mb-8">
                                    Descubre cuánto dinero estás perdiendo realmente por ineficiencia operativa. Herramienta exclusiva del curso.
                                </p>
                                <ul className="space-y-4 mb-8">
                                    {[
                                        "Plantilla editable en Excel",
                                        "Video explicativo de 5 min",
                                        "Checklist de fugas de dinero"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-300">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-white p-8 rounded-2xl shadow-xl text-slate-900">
                                <h3 className="text-xl font-bold mb-2">Obtén acceso inmediato</h3>
                                <p className="text-slate-500 mb-6 text-sm">Ingresa tus datos para recibir el material en tu correo.</p>

                                <AcademyForm />

                                <p className="text-xs text-center text-slate-400 mt-4">
                                    Al registrarte aceptas recibir correos de Bukeer Academy.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="py-8 bg-slate-950 text-slate-400 border-t border-slate-900">
                <div className="container px-4 text-center text-sm">
                    <p>&copy; {new Date().getFullYear()} Bukeer. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    );
}
