'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  loadContactFormsAction,
  createContactFormAction,
  updateContactFormAction,
  deleteContactFormAction,
  loadContactMessagesAction,
  updateContactMessageStatusAction,
  deleteContactMessageAction,
} from '@/app/(admin)/_actions/contact';

interface ContactForm {
  id: number;
  machine_name: string;
  label: string;
  description?: string;
  recipients: string[];
  message?: string;
  weight: number;
  status: boolean;
}

interface ContactMessage {
  id: number;
  form_id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  uid?: number;
  created: number;
  status: 'new' | 'read' | 'replied';
}

interface ContactClientProps {
  initialForms: ContactForm[];
  initialMessages: ContactMessage[];
}

export default function ContactClient({ initialForms, initialMessages }: ContactClientProps) {
  const router = useRouter();
  const [forms, setForms] = useState<ContactForm[]>(initialForms);
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'forms' | 'messages'>('forms');

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRecipients, setNewRecipients] = useState('');
  const [newAutoReply, setNewAutoReply] = useState('');

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRecipients, setEditRecipients] = useState('');
  const [editAutoReply, setEditAutoReply] = useState('');

  // Message state
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadForms = async () => {
    const result = await loadContactFormsAction();
    if (result.success) setForms(result.data as ContactForm[]);
    else setError(result.error || 'Failed to load contact forms');
  };

  const loadMessages = async () => {
    const result = await loadContactMessagesAction();
    if (result.success) setMessages(result.data as ContactMessage[]);
    else setError(result.error || 'Failed to load messages');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await createContactFormAction({
        machine_name: newMachineName,
        label: newLabel,
        description: newDescription,
        recipients: newRecipients.split(',').map((r) => r.trim()).filter(Boolean),
        auto_reply: newAutoReply,
      });
      if (!result.success) {
        setError(result.error || 'Failed to create contact form');
        return;
      }
      setShowAdd(false);
      setNewMachineName('');
      setNewLabel('');
      setNewDescription('');
      setNewRecipients('');
      setNewAutoReply('');
      setSuccess('Contact form created.');
      loadForms();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact form');
    }
  };

  const handleStartEdit = (form: ContactForm) => {
    setEditingId(form.machine_name);
    setEditLabel(form.label);
    setEditDescription(form.description || '');
    setEditRecipients((form.recipients || []).join(', '));
    setEditAutoReply('');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setError('');
    setSuccess('');
    try {
      const result = await updateContactFormAction(editingId, {
        label: editLabel,
        description: editDescription,
        recipients: editRecipients.split(',').map((r) => r.trim()).filter(Boolean),
        auto_reply: editAutoReply,
      });
      if (!result.success) {
        setError(result.error || 'Failed to update contact form');
        return;
      }
      setEditingId(null);
      setSuccess('Contact form updated.');
      loadForms();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact form');
    }
  };

  const handleDeleteForm = async (machineName: string) => {
    if (!confirm(`Delete the "${machineName}" contact form?`)) return;
    setError('');
    setSuccess('');
    try {
      const result = await deleteContactFormAction(machineName);
      if (!result.success) {
        setError(result.error || 'Failed to delete contact form');
        return;
      }
      setSuccess('Contact form deleted.');
      loadForms();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact form');
    }
  };

  const handleUpdateMessageStatus = async (id: number, newStatus: string) => {
    setError('');
    setSuccess('');
    try {
      const result = await updateContactMessageStatusAction(id, newStatus);
      if (!result.success) {
        setError(result.error || 'Failed to update message status');
        return;
      }
      setSuccess(`Message #${id} status updated.`);
      loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update message status');
    }
  };

  const handleDeleteMessage = async (id: number) => {
    if (!confirm(`Delete message #${id}? This action cannot be undone.`)) return;
    setError('');
    setSuccess('');
    try {
      const result = await deleteContactMessageAction(id);
      if (!result.success) {
        setError(result.error || 'Failed to delete message');
        return;
      }
      setSuccess(`Message #${id} deleted.`);
      if (expandedId === id) setExpandedId(null);
      loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'read':
        return 'bg-gray-100 text-gray-800';
      case 'replied':
        return 'bg-emerald-50 text-gin-green';
      default:
        return 'bg-gin-bg-layer2 text-gin-text-light';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
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
        <span className="text-sm text-gin-text">Contact forms</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Contact Forms</h1>
          <p className="text-gin-text-light text-sm mt-1">
            Manage contact forms and submitted messages.
          </p>
        </div>
        {activeTab === 'forms' && (
          <button
            onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
            className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
          >
            Add contact form
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-5 border-b border-gin-border">
        <button
          onClick={() => setActiveTab('forms')}
          className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
            activeTab === 'forms'
              ? 'border-gin-primary text-gin-primary font-semibold'
              : 'border-transparent text-gin-text-light hover:text-gin-text font-medium'
          }`}
        >
          Forms
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
            activeTab === 'messages'
              ? 'border-gin-primary text-gin-primary font-semibold'
              : 'border-transparent text-gin-text-light hover:text-gin-text font-medium'
          }`}
        >
          Messages ({messages.length})
        </button>
      </div>

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

      {activeTab === 'forms' && (
        <>
          {showAdd && (
            <form onSubmit={handleCreate} className="bg-white rounded-gin-l border border-gin-border p-6 mb-5 max-w-xl">
              <h2 className="text-lg font-semibold text-gin-title mb-4">Add contact form</h2>
              <div className="mb-5">
                <label htmlFor="contact-machine-name" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Machine name
                </label>
                <input
                  id="contact-machine-name"
                  type="text"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  placeholder="feedback"
                  pattern="^[a-z][a-z0-9_]*$"
                  required
                />
                <p className="text-xs text-gin-text-light mt-1.5">Lowercase letters, numbers, and underscores only.</p>
              </div>
              <div className="mb-5">
                <label htmlFor="contact-label" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Label
                </label>
                <input
                  id="contact-label"
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  placeholder="Website Feedback"
                  required
                />
              </div>
              <div className="mb-5">
                <label htmlFor="contact-desc" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Description
                </label>
                <textarea
                  id="contact-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  rows={2}
                  placeholder="Optional description shown to users"
                />
              </div>
              <div className="mb-5">
                <label htmlFor="contact-recipients" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Recipients
                </label>
                <input
                  id="contact-recipients"
                  type="text"
                  value={newRecipients}
                  onChange={(e) => setNewRecipients(e.target.value)}
                  className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  placeholder="admin@example.com, support@example.com"
                />
                <p className="text-xs text-gin-text-light mt-1.5">Comma-separated email addresses.</p>
              </div>
              <div className="mb-5">
                <label htmlFor="contact-auto-reply" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Auto-reply message
                </label>
                <textarea
                  id="contact-auto-reply"
                  value={newAutoReply}
                  onChange={(e) => setNewAutoReply(e.target.value)}
                  className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  rows={3}
                  placeholder="Optional auto-reply sent to the sender"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors">
                  Create form
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 bg-white border border-gin-border text-gin-text text-sm font-semibold rounded-gin hover:bg-gin-bg-layer2 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {editingId && (
            <div className="bg-white rounded-gin-l border border-gin-border p-6 mb-5 max-w-xl">
              <h2 className="text-lg font-semibold text-gin-title mb-4">
                Edit form: {editingId}
              </h2>
              <div className="mb-5">
                <label htmlFor="edit-label" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Label
                </label>
                <input
                  id="edit-label"
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  required
                />
              </div>
              <div className="mb-5">
                <label htmlFor="edit-desc" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Description
                </label>
                <textarea
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  rows={2}
                />
              </div>
              <div className="mb-5">
                <label htmlFor="edit-recipients" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Recipients
                </label>
                <input
                  id="edit-recipients"
                  type="text"
                  value={editRecipients}
                  onChange={(e) => setEditRecipients(e.target.value)}
                  className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                />
                <p className="text-xs text-gin-text-light mt-1.5">Comma-separated email addresses.</p>
              </div>
              <div className="mb-5">
                <label htmlFor="edit-auto-reply" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Auto-reply message
                </label>
                <textarea
                  id="edit-auto-reply"
                  value={editAutoReply}
                  onChange={(e) => setEditAutoReply(e.target.value)}
                  className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveEdit} className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors">
                  Save changes
                </button>
                <button onClick={() => setEditingId(null)} className="px-5 py-2.5 bg-white border border-gin-border text-gin-text text-sm font-semibold rounded-gin hover:bg-gin-bg-layer2 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-gin-l border border-gin-border overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-gin-bg-layer2 border-b border-gin-border-table">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Label</th>
                  <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Machine Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Recipients</th>
                  <th className="text-center px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Operations</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr key={form.machine_name} className="border-b border-gin-border-table last:border-0">
                    <td className="px-4 py-3 font-medium text-gin-title">{form.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gin-text-light">{form.machine_name}</td>
                    <td className="px-4 py-3 text-gin-text text-xs">
                      {(form.recipients || []).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        form.status !== false
                          ? 'bg-emerald-50 text-gin-green'
                          : 'bg-gin-bg-layer2 text-gin-text-light'
                      }`}>
                        {form.status !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button
                        onClick={() => handleStartEdit(form)}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteForm(form.machine_name)}
                        className="text-sm text-gin-danger hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {forms.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gin-text-light">
                      No contact forms configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white rounded-gin-l border border-gin-border overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Form</th>
                <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Subject</th>
                <th className="text-center px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Operations</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} className="border-b border-gin-border-table last:border-0">
                  <td className="px-4 py-3 text-gin-text-light text-xs">
                    {formatDate(msg.created)}
                  </td>
                  <td className="px-4 py-3 text-gin-text">{msg.form_id}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                      className="font-medium text-gin-primary hover:underline text-left"
                    >
                      {msg.name}
                    </button>
                    {expandedId === msg.id && (
                      <div className="mt-2 p-3 bg-gin-bg-layer2 rounded-gin-s text-sm text-gin-text whitespace-pre-wrap">
                        <div className="text-xs text-gin-text-light mb-1">{msg.email} - {msg.subject}</div>
                        {msg.message}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gin-title">{msg.subject}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(msg.status)}`}>
                      {msg.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <select
                      value={msg.status}
                      onChange={(e) => handleUpdateMessageStatus(msg.id, e.target.value)}
                      className="text-xs rounded-gin-s px-2 py-1 border border-gin-border-form bg-white text-gin-text focus:outline-none focus:ring-1 focus:ring-gin-primary"
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="replied">Replied</option>
                    </select>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="text-sm text-gin-danger hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gin-text-light">
                    No messages found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
