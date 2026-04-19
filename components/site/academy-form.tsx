'use client';

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

export function AcademyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const text = getPublicUiExtraTextGetter('es-CO');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">{text('academyNameLabel')}</label>
        <input
          id="name"
          type="text"
          placeholder={text('academyNamePlaceholder')}
          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">{text('academyEmailLabel')}</label>
        <input
          id="email"
          type="email"
          placeholder={text('academyEmailPlaceholder')}
          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
      >
        <Download className="w-4 h-4 mr-2" />
        {isSubmitting ? 'Enviando...' : 'Descargar Ahora'}
      </Button>
    </form>
  );
}
