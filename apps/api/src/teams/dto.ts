import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

// Zod Schemas
export const CreateTeamDto = z.object({
  name: z.string().min(1, { message: 'Team name is required' }),
});
export type CreateTeamInput = z.infer<typeof CreateTeamDto>;

export const AddMemberDto = z.object({
  email: z.string().email({ message: 'Valid email is required' }),
  role: z.enum(['ADMIN', 'MEMBER'], {
    message: 'Role must be ADMIN or MEMBER',
  }),
});
export type AddMemberInput = z.infer<typeof AddMemberDto>;

// Swagger DTOs
export class CreateTeamRequestDto {
  @ApiProperty({
    example: 'Engineering Team',
    description: 'Team name',
  })
  name!: string;
}

export class AddMemberRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user to add to the team',
  })
  email!: string;

  @ApiProperty({
    example: 'MEMBER',
    description: 'Role for the new member',
    enum: ['ADMIN', 'MEMBER'],
  })
  role!: 'ADMIN' | 'MEMBER';
}

export class TeamResponseDto {
  @ApiProperty({ example: 'cuid123', description: 'Team ID' })
  id!: string;

  @ApiProperty({ example: 'Engineering Team', description: 'Team name' })
  name!: string;

  @ApiProperty({ description: 'Team creation timestamp' })
  createdAt!: Date;
}

export class MemberResponseDto {
  @ApiProperty({ example: 'cuid123', description: 'Member ID' })
  id!: string;

  @ApiProperty({
    example: 'MEMBER',
    description: 'Member role in the team',
    enum: ['OWNER', 'ADMIN', 'MEMBER'],
  })
  role!: string;

  @ApiProperty({ example: 'cuid123', description: 'User ID' })
  userId!: string;

  @ApiProperty({ example: 'cuid123', description: 'Team ID' })
  teamId!: string;
}
