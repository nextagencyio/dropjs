/**
 * Mail system for drop.js.
 *
 * Provides a pluggable transport abstraction with SMTP (nodemailer) and console fallback.
 * Used by password reset, contact form submission, and registration confirmation.
 *
 * Templates can be overridden via `setMailTemplate(key, renderFn)` for full customization.
 *
 * Configuration via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 *
 * When SMTP is not configured, emails are logged to stdout (dev mode).
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { createLogger } from './logger.js';

const logger = createLogger('mail');

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// ─── Mail Template System ────────────────────────────────────

export interface MailTemplateResult {
  subject: string;
  text: string;
  html?: string;
}

export type MailTemplateRenderer<T = unknown> = (data: T, context: MailTemplateContext) => MailTemplateResult;

export interface MailTemplateContext {
  siteUrl: string;
  siteName: string;
}

function getTemplateContext(): MailTemplateContext {
  return {
    siteUrl: process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`,
    siteName: process.env.SITE_NAME || 'drop.js',
  };
}

// Stored on globalThis for webpack module sharing.
const gMail = globalThis as unknown as { __dropjs_mail_template_registry?: Map<string, MailTemplateRenderer<any>> };
if (!gMail.__dropjs_mail_template_registry) gMail.__dropjs_mail_template_registry = new Map<string, MailTemplateRenderer<any>>();
const templateRegistry = gMail.__dropjs_mail_template_registry;

/**
 * Register or override a mail template.
 *
 * Built-in template keys:
 *   - `password_reset` — data: `{ email: string; token: string }`
 *   - `contact_notification` — data: `{ formName, name, email, subject, message }`
 *   - `registration` — data: `{ email: string; username: string }`
 */
export function setMailTemplate<T>(key: string, renderer: MailTemplateRenderer<T>): void {
  templateRegistry.set(key, renderer);
}

/**
 * Get a registered template renderer, or undefined.
 */
export function getMailTemplate<T>(key: string): MailTemplateRenderer<T> | undefined {
  return templateRegistry.get(key);
}

/**
 * List all registered template keys.
 */
export function listMailTemplates(): string[] {
  return [...templateRegistry.keys()];
}

/**
 * Reset a template to its default by removing the override.
 */
export function resetMailTemplate(key: string): void {
  templateRegistry.delete(key);
  // Re-register the built-in default if one exists
  const defaultRenderer = defaultTemplates[key];
  if (defaultRenderer) {
    templateRegistry.set(key, defaultRenderer);
  }
}

// ─── Default Templates ──────────────────────────────────────

interface PasswordResetData {
  email: string;
  token: string;
}

interface ContactNotificationData {
  formName: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface RegistrationData {
  email: string;
  username: string;
}

const defaultTemplates: Record<string, MailTemplateRenderer<any>> = {
  password_reset: (data: PasswordResetData, ctx: MailTemplateContext): MailTemplateResult => {
    const resetUrl = `${ctx.siteUrl}/reset-password?token=${data.token}`;
    return {
      subject: 'Password reset request',
      text: `You requested a password reset.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
      html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
    };
  },

  contact_notification: (data: ContactNotificationData, _ctx: MailTemplateContext): MailTemplateResult => {
    return {
      subject: `[Contact] ${data.subject}`,
      text: `New contact form submission (${data.formName}):\n\nFrom: ${data.name} <${data.email}>\nSubject: ${data.subject}\n\n${data.message}`,
      html: `<h3>New contact form submission (${data.formName})</h3><p><strong>From:</strong> ${data.name} &lt;${data.email}&gt;<br><strong>Subject:</strong> ${data.subject}</p><hr><p>${data.message.replace(/\n/g, '<br>')}</p>`,
    };
  },

  registration: (data: RegistrationData, ctx: MailTemplateContext): MailTemplateResult => {
    return {
      subject: 'Welcome — your account has been created',
      text: `Welcome ${data.username}!\n\nYour account has been created. Log in at:\n${ctx.siteUrl}/login`,
      html: `<p>Welcome <strong>${data.username}</strong>!</p><p>Your account has been created. <a href="${ctx.siteUrl}/login">Log in here</a>.</p>`,
    };
  },
};

// Register defaults on module load
for (const [key, renderer] of Object.entries(defaultTemplates)) {
  templateRegistry.set(key, renderer);
}

// ─── Transport ──────────────────────────────────────────────

let transporter: Transporter | null = null;

function getFrom(): string {
  return process.env.MAIL_FROM || 'noreply@localhost';
}

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) return null;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

/**
 * Send an email. Falls back to console logging when SMTP is not configured.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    logger.info('Mail (console transport)', {
      to: message.to,
      subject: message.subject,
      body: message.text,
    });
    return true;
  }

  try {
    await transport.sendMail({
      from: getFrom(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    logger.info('Mail sent', { to: message.to, subject: message.subject });
    return true;
  } catch (err) {
    logger.error('Mail send failed', { to: message.to, error: (err as Error).message });
    return false;
  }
}

/**
 * Send a templated email. Uses the registered template renderer for the given key.
 */
export async function sendTemplatedMail<T>(key: string, to: string, data: T): Promise<boolean> {
  const renderer = templateRegistry.get(key);
  if (!renderer) {
    logger.error('Mail template not found', { key });
    return false;
  }

  const ctx = getTemplateContext();
  const result = renderer(data, ctx);

  return sendMail({
    to,
    subject: result.subject,
    text: result.text,
    html: result.html,
  });
}

// ─── Convenience Functions ──────────────────────────────────
// These use the template system internally so overrides take effect.

/**
 * Send a password reset email with the token link.
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  return sendTemplatedMail('password_reset', email, { email, token });
}

/**
 * Send a contact form submission notification to the site admin.
 */
export async function sendContactNotification(data: {
  formName: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  const adminEmail = process.env.SITE_EMAIL || process.env.MAIL_FROM || 'admin@localhost';
  return sendTemplatedMail('contact_notification', adminEmail, data);
}

/**
 * Send a registration welcome email.
 */
export async function sendRegistrationEmail(email: string, username: string): Promise<boolean> {
  return sendTemplatedMail('registration', email, { email, username });
}
