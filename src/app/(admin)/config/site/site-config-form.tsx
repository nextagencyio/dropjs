'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateSiteConfig } from '@/app/(admin)/_actions/system';

interface SiteConfigFormProps {
  initialConfig: {
    name: string;
    slogan: string;
    mail: string;
    front_page: string;
  };
}

export default function SiteConfigForm({ initialConfig }: SiteConfigFormProps) {
  const [name, setName] = useState(initialConfig.name);
  const [slogan, setSlogan] = useState(initialConfig.slogan);
  const [mail, setMail] = useState(initialConfig.mail);
  const [frontPage, setFrontPage] = useState(initialConfig.front_page);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateSiteConfig({
        name,
        slogan,
        mail,
        front_page: frontPage,
      });
      if (!result.success) {
        setError(result.error || 'Failed to save site configuration');
      } else {
        setSuccess('The configuration options have been saved.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save site configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/config"
          className="text-sm text-gin-primary hover:underline"
        >
          Configuration
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text">Site information</span>
      </div>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-5">
        Site information
      </h1>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-gin-green rounded-gin-s text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-gin-l border border-gin-border p-6 max-w-xl">
        <div className="mb-5">
          <label htmlFor="site-name" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Site name
          </label>
          <input
            id="site-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
            placeholder="My site"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="slogan" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Slogan
          </label>
          <input
            id="slogan"
            type="text"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
            placeholder="A catchy slogan for your site"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="email" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
            placeholder="admin@example.com"
          />
          <p className="text-xs text-gin-text-light mt-1.5">
            The site email address is used as the From address in automated emails.
          </p>
        </div>

        <div className="mb-7">
          <label htmlFor="front-page" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Front page
          </label>
          <input
            id="front-page"
            type="text"
            value={frontPage}
            onChange={(e) => setFrontPage(e.target.value)}
            className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
            placeholder="/admin"
          />
          <p className="text-xs text-gin-text-light mt-1.5">
            The path to the default front page.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save configuration'}
          </button>
          <Link
            href="/config"
            className="px-5 py-2.5 bg-white border border-gin-border text-gin-text text-sm font-semibold rounded-gin hover:bg-gin-bg-layer2 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
