'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getDashboardUserContext } from '@/lib/admin/user-context';

const PRESETS = [
  { id: 'blank', name: 'Blank', mood: 'corporate', color: '#1976D2', desc: 'Start from scratch' },
  { id: 'adventure', name: 'Adventure', mood: 'adventurous', color: '#E65100', desc: 'Bold & dynamic' },
  { id: 'luxury', name: 'Luxury', mood: 'luxurious', color: '#1A237E', desc: 'Refined elegance' },
  { id: 'tropical', name: 'Tropical', mood: 'tropical', color: '#00897B', desc: 'Warm & vibrant' },
  { id: 'corporate', name: 'Corporate', mood: 'corporate', color: '#37474F', desc: 'Clean & professional' },
  { id: 'boutique', name: 'Boutique', mood: 'boutique', color: '#795548', desc: 'Artisanal & cozy' },
  { id: 'cultural', name: 'Cultural', mood: 'cultural', color: '#BF360C', desc: 'Rich & expressive' },
  { id: 'eco', name: 'Eco', mood: 'eco', color: '#2E7D32', desc: 'Natural & organic' },
  { id: 'romantic', name: 'Romantic', mood: 'romantic', color: '#AD1457', desc: 'Soft & elegant' },
];

export default function NewWebsitePage() {
  const [step, setStep] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState('blank');
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainError, setSubdomainError] = useState('');
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function checkSubdomain(value: string) {
    if (!value || value.length < 3) {
      setSubdomainError('Minimum 3 characters');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      setSubdomainError('Only lowercase letters, numbers, and hyphens');
      return;
    }

    setSubdomainChecking(true);
    const { data } = await supabase
      .from('websites')
      .select('id')
      .eq('subdomain', value)
      .is('deleted_at', null)
      .limit(1);

    if (data && data.length > 0) {
      setSubdomainError('This subdomain is already taken');
    } else {
      setSubdomainError('');
    }
    setSubdomainChecking(false);
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    const preset = PRESETS.find((p) => p.id === selectedPreset) || PRESETS[0];

    const context = await getDashboardUserContext(supabase);
    if (context.status === 'unauthenticated') {
      setCreateError('Tu sesión expiró. Inicia sesión nuevamente.');
      setCreating(false);
      return;
    }
    if (context.status === 'missing_role') {
      setCreateError('No tienes un rol activo para crear sitios web.');
      setCreating(false);
      return;
    }

    const { data: website, error } = await supabase
      .from('websites')
      .insert({
        account_id: context.accountId,
        subdomain,
        status: 'draft',
        template_id: preset.id,
        theme: {
          tokens: { colors: { seedColor: preset.color } },
          profile: { brandMood: preset.mood },
        },
        content: {
          siteName: name,
          tagline: '',
          seo: { title: name, description: '', keywords: '' },
          contact: { email: '', phone: '', address: '' },
          social: {},
        },
        featured_products: { destinations: [], hotels: [], activities: [], transfers: [] },
        sections: [],
      })
      .select()
      .single();

    if (error) {
      setCreateError(error.message || 'No se pudo crear el sitio web.');
      setCreating(false);
      return;
    }

    setCreated(true);

    // Confetti + redirect
    setTimeout(() => {
      router.push(`/dashboard/${website.id}/pages`);
    }, 2000);
  }

  const progress = ((step + 1) / 3) * 100;

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full mb-8 overflow-hidden">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {created ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Website created!
              </h2>
              <p className="text-slate-500 mt-2">Redirecting to editor...</p>
            </motion.div>
          ) : step === 0 ? (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Choose a template
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Pick a style that matches your brand
              </p>
              <div className="grid grid-cols-3 gap-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setStep(1);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-lg ${
                      selectedPreset === preset.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg mb-3"
                      style={{ backgroundColor: preset.color }}
                    />
                    <div className="font-medium text-slate-900 dark:text-white text-sm">
                      {preset.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : step === 1 ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Name your website
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Choose a name and subdomain for your site
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Website name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      const slug = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '');
                      setSubdomain(slug);
                      checkSubdomain(slug);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My Travel Agency"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subdomain
                  </label>
                  <div className="flex items-center">
                    <input
                      value={subdomain}
                      onChange={(e) => {
                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setSubdomain(v);
                        checkSubdomain(v);
                      }}
                      className="flex-1 px-4 py-3 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="my-agency"
                    />
                    <span className="px-4 py-3 bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-r-xl text-slate-500 dark:text-slate-400 text-sm">
                      .bukeer.com
                    </span>
                  </div>
                  {subdomainError && (
                    <p className="text-red-500 text-sm mt-1">{subdomainError}</p>
                  )}
                  {subdomainChecking && (
                    <p className="text-slate-400 text-sm mt-1">Checking availability...</p>
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(0)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!name || !subdomain || !!subdomainError}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors"
                >
                  Next
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Review & Create
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 mt-6">
                <div className="flex justify-between">
                  <span className="text-slate-500">Template</span>
                  <span className="font-medium text-slate-900 dark:text-white capitalize">
                    {selectedPreset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="font-medium text-slate-900 dark:text-white">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">URL</span>
                  <span className="font-medium text-blue-600">{subdomain}.bukeer.com</span>
                </div>
              </div>
              {createError && (
                <div className="mt-4 rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm dark:border-red-700 dark:bg-red-950/30 dark:text-red-300">
                  {createError}
                </div>
              )}
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  {creating && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Create website
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
