import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  const mockConfigService = {
    get: jest.fn(),
  };

  describe('constructor', () => {
    it('should initialize with valid JWT_REFRESH_SECRET', async () => {
      mockConfigService.get.mockReturnValue('test-refresh-secret');

      const module = await Test.createTestingModule({
        providers: [
          JwtRefreshStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      expect(module).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_REFRESH_SECRET');
    });

    it('should throw error when JWT_REFRESH_SECRET is missing', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() => {
        new JwtRefreshStrategy(mockConfigService as unknown as ConfigService);
      }).toThrow('No secret key is present');
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('test-refresh-secret');
      strategy = new JwtRefreshStrategy(
        mockConfigService as unknown as ConfigService,
      );
    });

    it('should validate and return valid JWT payload', () => {
      const validPayload = {
        sub: 'user-123',
        email: 'user@example.com',
      };

      const result = strategy.validate(validPayload);

      expect(result).toEqual(validPayload);
    });

    it('should throw error when payload is missing sub', () => {
      const invalidPayload = {
        email: 'user@example.com',
      };

      expect(() => strategy.validate(invalidPayload)).toThrow(
        'Invalid JWT payload',
      );
    });

    it('should throw error when payload.sub is not a string', () => {
      const invalidPayload = {
        sub: 123,
        email: 'user@example.com',
      };

      expect(() => strategy.validate(invalidPayload)).toThrow(
        'Invalid JWT payload',
      );
    });

    it('should throw error when payload is null', () => {
      expect(() => strategy.validate(null)).toThrow('Invalid JWT payload');
    });

    it('should throw error when payload is not an object', () => {
      expect(() => strategy.validate('invalid')).toThrow(
        'Invalid JWT payload',
      );
      expect(() => strategy.validate(123)).toThrow('Invalid JWT payload');
      expect(() => strategy.validate(true)).toThrow('Invalid JWT payload');
    });

    it('should validate payload with additional properties', () => {
      const validPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: 'admin',
      };

      const result = strategy.validate(validPayload);

      expect(result).toEqual(validPayload);
    });
  });
});
