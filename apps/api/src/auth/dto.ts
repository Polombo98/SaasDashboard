import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const RegisterDto = z.object({
  email: z.email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' }),
  name: z.string().min(1).optional(),
});
export type RegisterInput = z.infer<typeof RegisterDto>;

export const LoginDto = z.object({
  email: z.email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' }),
});
export type LoginInput = z.infer<typeof LoginDto>;

export class RegisterRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email!: string;

  @ApiProperty({
    example: 'SecurePass123',
    description: 'User password (minimum 8 characters)',
    minLength: 8,
  })
  password!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User name',
    required: false,
  })
  name?: string;
}

export class LoginRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email!: string;

  @ApiProperty({
    example: 'SecurePass123',
    description: 'User password',
    minLength: 8,
  })
  password!: string;
}

export class UserResponseDto {
  @ApiProperty({ example: 'cuid123', description: 'User ID' })
  id!: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  email!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User name',
    required: false,
  })
  name?: string | null;

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken!: string;
}

export class RefreshResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'New JWT access token',
  })
  accessToken!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
