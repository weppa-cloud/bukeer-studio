'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';

interface DomainWizardProps {
  websiteId: string;
  currentDomain: string | null;
}

export function DomainWizard({ websiteId, currentDomain }: DomainWizardProps) {
  const supabase = createSupabaseBrowserClient();
  const [domain, setDomain] = useState(currentDomain || '');
  const [step, setStep] = useState(currentDomain ? 2 : 0);
  const [verifying, setVerifying] = useState(false);

  async function saveDomain() {
    await supabase.from('websites').update({ custom_domain: domain }).eq('id', websiteId);
    setStep(1);
  }

  async function verifyDNS() {
    setVerifying(true);
    // In production, this would check DNS records
    setTimeout(() => {
      setVerifying(false);
      setStep(2);
    }, 2000);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Custom Domain</h3>

      {/* Step 0: Enter domain */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Connect your own domain to your Bukeer website.
          </p>
          <div className="flex gap-2">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/\s/g, ''))}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
              placeholder="www.myagency.com"
            />
            <button
              onClick={saveDomain}
              disabled={!domain}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 1: DNS instructions */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">
              Step 1: Add CNAME record
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
              Go to your domain registrar&apos;s DNS settings and add the following record:
            </p>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 font-mono text-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Type:</span>
                <span className="text-slate-900 dark:text-white">CNAME</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Name:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-white">{domain.startsWith('www.') ? 'www' : '@'}</span>
                  <button
                    onClick={() => copyToClipboard(domain.startsWith('www.') ? 'www' : '@')}
                    className="text-blue-500 text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Value:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-white">cname.bukeer.com</span>
                  <button
                    onClick={() => copyToClipboard('cname.bukeer.com')}
                    className="text-blue-500 text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={verifyDNS}
            disabled={verifying}
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {verifying ? 'Verifying DNS...' : 'Verify DNS records'}
          </button>
        </div>
      )}

      {/* Step 2: Connected */}
      {step === 2 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h4 className="text-sm font-medium text-green-800 dark:text-green-300">
              Domain connected
            </h4>
          </div>
          <p className="text-sm text-green-700 dark:text-green-400">
            <strong>{domain || currentDomain}</strong> is pointing to your Bukeer website.
          </p>
          <button
            onClick={() => { setStep(0); setDomain(''); }}
            className="mt-3 text-sm text-red-600 hover:text-red-700"
          >
            Remove custom domain
          </button>
        </div>
      )}
    </div>
  );
}
