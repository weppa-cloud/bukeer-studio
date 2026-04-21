import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

export function AcademyHero({ locale = 'es-CO' }: { locale?: string } = {}) {
  const text = getPublicUiExtraTextGetter(locale);

  return (
    <section className="relative w-full py-20 lg:py-32 overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      <div className="container relative z-10 px-4 md:px-6 mx-auto text-center">
        <div className="inline-block px-3 py-1 mb-4 text-sm font-medium text-emerald-400 bg-emerald-950/30 rounded-full border border-emerald-800">
          {text('academyHeroBadge')}
        </div>
        
        <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
          {text('academyHeroTitlePrefix')} <span className="text-emerald-500">{text('academyHeroTitleEmphasis')}</span>
        </h1>
        
        <p className="max-w-[700px] mx-auto mt-4 text-slate-400 md:text-xl">
          {text('academyHeroSubtitle')}
        </p>
        
        <div className="flex flex-col items-center gap-4 mt-8 sm:flex-row sm:justify-center">
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px] h-12 text-lg">
            {text('academyHeroStart')}
          </Button>
          <Link href="#temario" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            {text('academyHeroSyllabus')}
          </Link>
        </div>

        <div className="mt-12 p-4 bg-slate-900/50 rounded-lg border border-slate-800 inline-block">
          <p className="text-sm text-slate-400">
            <span className="text-emerald-400 font-bold">{text('academyHeroBonusLabel')}</span> {text('academyHeroBonusDescription')}
          </p>
        </div>
      </div>
    </section>
  );
}
