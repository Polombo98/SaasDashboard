import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private readonly fromEmail = 'onboarding@resend.dev'; // Resend's test email

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY not found. Email sending will fail. Please add RESEND_API_KEY to your .env file.',
      );
    }

    this.resend = new Resend(apiKey);
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    name?: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Verify your email address',
        html: this.getVerificationEmailTemplate(verificationUrl, name),
      });

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw new Error('Failed to send verification email');
    }
  }

  private getVerificationEmailTemplate(
    verificationUrl: string,
    name?: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1976d2;">
                SaaS Dashboard
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #333;">
                Verify your email address
              </h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #666;">
                ${name ? `Hi ${name},` : 'Hi there,'}
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #666;">
                Thank you for signing up for SaaS Dashboard! To complete your registration and access your account, please verify your email address by clicking the button below.
              </p>

              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 4px; background-color: #1976d2;">
                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 4px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px; font-size: 14px; line-height: 1.5; color: #666;">
                Or copy and paste this link into your browser:
              </p>

              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #1976d2; word-break: break-all;">
                ${verificationUrl}
              </p>

              <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.5; color: #999;">
                This link will expire in 24 hours.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0; background-color: #f9f9f9;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                If you didn't create an account with SaaS Dashboard, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
