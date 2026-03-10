import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setMailTemplate,
  getMailTemplate,
  listMailTemplates,
  resetMailTemplate,
  sendPasswordResetEmail,
  sendContactNotification,
  sendRegistrationEmail,
  sendTemplatedMail,
} from '../../src/core/mail.js';
import type { MailTemplateRenderer, MailTemplateContext } from '../../src/core/mail.js';

describe('Mail Template System', () => {
  it('should have 3 default templates registered', () => {
    const keys = listMailTemplates();
    expect(keys).toContain('password_reset');
    expect(keys).toContain('contact_notification');
    expect(keys).toContain('registration');
  });

  it('should return a template renderer by key', () => {
    const renderer = getMailTemplate('password_reset');
    expect(renderer).toBeDefined();
    expect(typeof renderer).toBe('function');
  });

  it('should return undefined for non-existent template', () => {
    const renderer = getMailTemplate('nonexistent_template');
    expect(renderer).toBeUndefined();
  });

  it('should render password reset template with correct content', () => {
    const renderer = getMailTemplate<{ email: string; token: string }>('password_reset')!;
    const ctx: MailTemplateContext = { siteUrl: 'https://example.com', siteName: 'Test Site' };
    const result = renderer({ email: 'test@test.com', token: 'abc123' }, ctx);

    expect(result.subject).toBe('Password reset request');
    expect(result.text).toContain('https://example.com/reset-password?token=abc123');
    expect(result.html).toContain('abc123');
  });

  it('should render contact notification template', () => {
    const renderer = getMailTemplate('contact_notification')!;
    const ctx: MailTemplateContext = { siteUrl: 'https://example.com', siteName: 'Test Site' };
    const result = renderer({
      formName: 'Feedback',
      name: 'Alice',
      email: 'alice@test.com',
      subject: 'Hello',
      message: 'Test message',
    }, ctx);

    expect(result.subject).toBe('[Contact] Hello');
    expect(result.text).toContain('Alice');
    expect(result.text).toContain('alice@test.com');
    expect(result.text).toContain('Test message');
  });

  it('should render registration template', () => {
    const renderer = getMailTemplate<{ email: string; username: string }>('registration')!;
    const ctx: MailTemplateContext = { siteUrl: 'https://example.com', siteName: 'Test Site' };
    const result = renderer({ email: 'bob@test.com', username: 'bob' }, ctx);

    expect(result.subject).toContain('Welcome');
    expect(result.text).toContain('bob');
    expect(result.text).toContain('https://example.com/login');
  });

  describe('Template Override', () => {
    afterEach(() => {
      // Restore defaults
      resetMailTemplate('password_reset');
      resetMailTemplate('contact_notification');
      resetMailTemplate('registration');
    });

    it('should allow overriding a built-in template', () => {
      const customRenderer: MailTemplateRenderer<{ email: string; token: string }> = (data, ctx) => ({
        subject: `Custom Reset for ${ctx.siteName}`,
        text: `Reset your password: ${ctx.siteUrl}/custom-reset/${data.token}`,
        html: `<p>Custom HTML reset for ${data.email}</p>`,
      });

      setMailTemplate('password_reset', customRenderer);

      const renderer = getMailTemplate<{ email: string; token: string }>('password_reset')!;
      const result = renderer(
        { email: 'test@test.com', token: 'tok123' },
        { siteUrl: 'https://mysite.com', siteName: 'My Site' }
      );

      expect(result.subject).toBe('Custom Reset for My Site');
      expect(result.text).toContain('/custom-reset/tok123');
    });

    it('should restore default template after reset', () => {
      setMailTemplate('password_reset', () => ({
        subject: 'OVERRIDDEN',
        text: 'overridden',
      }));

      let renderer = getMailTemplate<{ email: string; token: string }>('password_reset')!;
      let result = renderer({ email: '', token: '' }, { siteUrl: '', siteName: '' });
      expect(result.subject).toBe('OVERRIDDEN');

      resetMailTemplate('password_reset');

      renderer = getMailTemplate<{ email: string; token: string }>('password_reset')!;
      result = renderer({ email: '', token: 'abc' }, { siteUrl: 'http://x', siteName: '' });
      expect(result.subject).toBe('Password reset request');
    });

    it('should allow registering custom template keys', () => {
      setMailTemplate('order_confirmation', (data: { orderId: string }, ctx) => ({
        subject: `Order ${data.orderId} confirmed`,
        text: `Your order ${data.orderId} has been confirmed on ${ctx.siteName}.`,
      }));

      expect(listMailTemplates()).toContain('order_confirmation');

      const renderer = getMailTemplate<{ orderId: string }>('order_confirmation')!;
      const result = renderer({ orderId: 'ORD-001' }, { siteUrl: '', siteName: 'Shop' });
      expect(result.subject).toBe('Order ORD-001 confirmed');

      // Clean up
      resetMailTemplate('order_confirmation');
    });
  });

  describe('sendTemplatedMail', () => {
    it('should return false for non-existent template', async () => {
      const result = await sendTemplatedMail('nonexistent', 'test@test.com', {});
      expect(result).toBe(false);
    });

    it('should send using the template renderer (console transport)', async () => {
      // Without SMTP configured, this uses console transport and returns true
      const result = await sendPasswordResetEmail('test@test.com', 'token123');
      expect(result).toBe(true);
    });

    it('should send contact notification via template', async () => {
      const result = await sendContactNotification({
        formName: 'Test',
        name: 'Alice',
        email: 'alice@test.com',
        subject: 'Test',
        message: 'Hello',
      });
      expect(result).toBe(true);
    });

    it('should send registration email via template', async () => {
      const result = await sendRegistrationEmail('bob@test.com', 'bob');
      expect(result).toBe(true);
    });
  });
});
