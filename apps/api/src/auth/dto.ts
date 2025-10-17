import { z } from 'zod';

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
