import type { DocKey, LegalDoc } from './features/legal/documents';

export interface SiteInfo {
  name: string;
  tagline: string;
  product: string;
  owner: string;
  ownerUrl: string;
  /** Set VITE_CONTACT_EMAIL to show an email address; otherwise Contact links to the owner's GitHub. */
  contactEmail?: string;
  demoNotice: string;
  collected: { heading: string; items: string[] }[];
  uses: string[];
  sharing: string[];
  extraRules: string[];
  cookieName: string;
  storage: { key: string; purpose: string }[];
  footerWidth: string;
  columns: { title: string; links: { label: string; to: string }[] }[];
  extraDocs?: Partial<Record<DocKey, LegalDoc>>;
}

const OWNER = { owner: "M'hammed Mazin", ownerUrl: 'https://github.com/Mazine01', contactEmail: import.meta.env.VITE_CONTACT_EMAIL as string | undefined };

export const SITE: SiteInfo = {
  ...OWNER,
  name: 'Ledgerline',
  tagline: 'A clear monthly picture of your money: what came in, what went out, and what’s left.',
  product: 'a personal expense tracker',
  demoNotice: 'The demo account contains sample data, and Ledgerline never connects to your bank.',
  collected: [
    { heading: 'Your account:', items: ['name, email and display currency', 'a hashed password'] },
    { heading: 'What you enter:', items: ['income and expenses with amounts, dates, categories and notes', 'your categories and monthly budgets'] },
  ],
  uses: ['to sign you in and keep your session secure', 'to calculate your totals, charts and budget progress', 'to export your transactions when you ask for a CSV'],
  sharing: ['Your financial data is visible only to you. It is never shared with other users.'],
  extraRules: ['use the service to process other people’s financial data without their permission.'],
  cookieName: 'ledgerline_session',
  storage: [{ key: 'ledgerline-theme', purpose: 'remembers whether you chose Light, Dark or Auto' }],
  footerWidth: 'max-w-[1120px]',
  columns: [
    { title: 'Product', links: [{ label: 'Overview', to: '/' }, { label: 'Transactions', to: '/transactions' }, { label: 'Budgets', to: '/budgets' }] },
    { title: 'Account', links: [{ label: 'Settings', to: '/settings' }, { label: 'Source code', to: 'https://github.com/Mazine01' }] },
  ],
};
