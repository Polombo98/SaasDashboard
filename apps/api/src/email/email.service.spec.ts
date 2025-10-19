import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { Resend } from 'resend';

jest.mock('resend');

interface EmailResponse {
  id: string;
}

interface MockResendInstance {
  emails: {
    send: jest.MockedFunction<
      (params: {
        from: string;
        to: string;
        subject: string;
        html: string;
      }) => Promise<EmailResponse>
    >;
  };
}

describe('EmailService', () => {
  let service: EmailService;
  let mockResendInstance: MockResendInstance;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock Resend instance with properly typed send method
    const mockSend = jest.fn<
      Promise<EmailResponse>,
      [{ from: string; to: string; subject: string; html: string }]
    >();
    mockResendInstance = {
      emails: {
        send: mockSend,
      },
    };

    // Mock the Resend constructor
    (Resend as jest.MockedClass<typeof Resend>).mockImplementation(
      () => mockResendInstance as unknown as Resend,
    );

    // Set environment variable for testing
    process.env.RESEND_API_KEY = 'test-api-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    const email = 'test@example.com';
    const token = 'verification-token-123';
    const name = 'Test User';

    it('should successfully send verification email with name', async () => {
      const emailResponse: EmailResponse = { id: 'email-id' };
      mockResendInstance.emails.send.mockResolvedValue(emailResponse);

      await service.sendVerificationEmail(email, token, name);

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Verify your email address',
        html: expect.stringContaining('Hi Test User') as string,
      });
      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(
            `http://localhost:3000/verify-email?token=${token}`,
          ) as string,
        }) as { from: string; to: string; subject: string; html: string },
      );
    });

    it('should successfully send verification email without name', async () => {
      const emailResponse: EmailResponse = { id: 'email-id' };
      mockResendInstance.emails.send.mockResolvedValue(emailResponse);

      await service.sendVerificationEmail(email, token);

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Verify your email address',
        html: expect.stringContaining('Hi there') as string,
      });
    });

    it('should use FRONTEND_URL from environment if provided', async () => {
      process.env.FRONTEND_URL = 'https://example.com';
      const emailResponse: EmailResponse = { id: 'email-id' };
      mockResendInstance.emails.send.mockResolvedValue(emailResponse);

      await service.sendVerificationEmail(email, token, name);

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(
            `https://example.com/verify-email?token=${token}`,
          ) as string,
        }) as { from: string; to: string; subject: string; html: string },
      );

      delete process.env.FRONTEND_URL;
    });

    it('should include verification link that expires in 24 hours message', async () => {
      const emailResponse: EmailResponse = { id: 'email-id' };
      mockResendInstance.emails.send.mockResolvedValue(emailResponse);

      await service.sendVerificationEmail(email, token, name);

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(
            'This link will expire in 24 hours',
          ) as string,
        }) as { from: string; to: string; subject: string; html: string },
      );
    });

    it('should throw error if email sending fails', async () => {
      mockResendInstance.emails.send.mockRejectedValue(
        new Error('Resend API error'),
      );

      await expect(
        service.sendVerificationEmail(email, token, name),
      ).rejects.toThrow('Failed to send verification email');
    });
  });

  describe('sendPasswordResetEmail', () => {
    const email = 'test@example.com';
    const token = 'reset-token-123';
    const name = 'Test User';

    it('should successfully send password reset email with name', async () => {
      const emailResponse: EmailResponse = { id: 'email-id' };
      mockResendInstance.emails.send.mockResolvedValue(emailResponse);

      await service.sendPasswordResetEmail(email, token, name);

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Reset your password',
        html: expect.stringContaining('Hi Test User') as string,
      });
      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(
            `http://localhost:3000/reset-password?token=${token}`,
          ) as string,
        }) as { from: string; to: string; subject: string; html: string },
      );
    });

    it('should successfully send password reset email without name', async () => {
      const emailResponse: EmailResponse = { id: 'email-id' };
      mockResendInstance.emails.send.mockResolvedValue(emailResponse);

      await service.sendPasswordResetEmail(email, token);

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Reset your password',
        html: expect.stringContaining('Hi there') as string,
      });
    });

    it('should use FRONTEND_URL from environment if provided', async () => {
      process.env.FRONTEND_URL = 'https://example.com';
      const emailResponse: EmailResponse = { id: 'email-id' };
      mockResendInstance.emails.send.mockResolvedValue(emailResponse);

      await service.sendPasswordResetEmail(email, token, name);

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(
            `https://example.com/reset-password?token=${token}`,
          ) as string,
        }) as { from: string; to: string; subject: string; html: string },
      );

      delete process.env.FRONTEND_URL;
    });

    it('should include reset link expiry message (1 hour)', async () => {
      const emailResponse: EmailResponse = { id: 'email-id' };
      mockResendInstance.emails.send.mockResolvedValue(emailResponse);

      await service.sendPasswordResetEmail(email, token, name);

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(
            'This link will expire in 1 hour',
          ) as string,
        }) as { from: string; to: string; subject: string; html: string },
      );
    });

    it('should throw error if email sending fails', async () => {
      mockResendInstance.emails.send.mockRejectedValue(
        new Error('Resend API error'),
      );

      await expect(
        service.sendPasswordResetEmail(email, token, name),
      ).rejects.toThrow('Failed to send password reset email');
    });
  });

  describe('constructor', () => {
    it('should log warning if RESEND_API_KEY is not provided', () => {
      const logSpy = jest.spyOn(console, 'warn').mockImplementation();
      delete process.env.RESEND_API_KEY;

      const module = Test.createTestingModule({
        providers: [EmailService],
      }).compile();

      expect(module).toBeDefined();
      logSpy.mockRestore();
    });
  });
});
