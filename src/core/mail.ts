/**
 * Mail system for drop.js.
 *
 * Provides a pluggable transport abstraction with SMTP (nodemailer) and console fallback.
 * Used by password reset, contact form submission, and registration confirmation.
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
 * Send a password reset email with the token link.
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const siteUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const resetUrl = `${siteUrl}/reset-password?token=${token}`;

  return sendMail({
    to: email,
    subject: 'Password reset request',
    text: `You requested a password reset.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
  });
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

  return sendMail({
    to: adminEmail,
    subject: `[Contact] ${data.subject}`,
    text: `New contact form submission (${data.formName}):\n\nFrom: ${data.name} <${data.email}>\nSubject: ${data.subject}\n\n${data.message}`,
    html: `<h3>New contact form submission (${data.formName})</h3><p><strong>From:</strong> ${data.name} &lt;${data.email}&gt;<br><strong>Subject:</strong> ${data.subject}</p><hr><p>${data.message.replace(/\n/g, '<br>')}</p>`,
  });
}

/**
 * Send a registration welcome email.
 */
export async function sendRegistrationEmail(email: string, username: string): Promise<boolean> {
  const siteUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;

  return sendMail({
    to: email,
    subject: 'Welcome — your account has been created',
    text: `Welcome ${username}!\n\nYour account has been created. Log in at:\n${siteUrl}/login`,
    html: `<p>Welcome <strong>${username}</strong>!</p><p>Your account has been created. <a href="${siteUrl}/login">Log in here</a>.</p>`,
  });
}
