/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

interface ValidationIssue {
  path: string;
  message: string;
}

@Injectable()
export class ZodValidationPipe<TOutput>
  implements PipeTransform<unknown, TOutput>
{
  constructor(private readonly schema: z.ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    try {
      return this.schema.parse(value);
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        const issues: ValidationIssue[] = err.issues.map((issue) => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          issues,
        });
      }
      throw err;
    }
  }
}
