import { getContactForms, getContactMessages } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import ContactClient from './contact-client';

export default async function ContactPage() {
  await requirePermission('administer contact forms');
  const [forms, messages] = await Promise.all([
    getContactForms(),
    getContactMessages(),
  ]);

  return <ContactClient initialForms={forms} initialMessages={messages} />;
}
