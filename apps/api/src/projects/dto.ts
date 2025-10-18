import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

// Zod Schemas
export const CreateProjectDto = z.object({
  name: z.string().min(1, { message: 'Project name is required' }),
});
export type CreateProjectInput = z.infer<typeof CreateProjectDto>;

// Swagger DTOs
export class CreateProjectRequestDto {
  @ApiProperty({
    example: 'My Web App',
    description: 'Project name',
  })
  name!: string;
}

export class ProjectResponseDto {
  @ApiProperty({ example: 'cuid123', description: 'Project ID' })
  id!: string;

  @ApiProperty({ example: 'My Web App', description: 'Project name' })
  name!: string;

  @ApiProperty({
    example: 'proj_1a2b3c4d5e6f7g8h9i0j',
    description: 'API key for this project',
  })
  apiKey!: string;

  @ApiProperty({ description: 'Project creation timestamp' })
  createdAt!: Date;
}

export class ProjectListResponseDto {
  @ApiProperty({ example: 'cuid123', description: 'Project ID' })
  id!: string;

  @ApiProperty({ example: 'My Web App', description: 'Project name' })
  name!: string;

  @ApiProperty({
    example: 'proj_1a2b3c4d5e6f7g8h9i0j',
    description: 'API key for this project',
  })
  apiKey!: string;

  @ApiProperty({ example: 'cuid123', description: 'Team ID' })
  teamId!: string;

  @ApiProperty({ description: 'Project creation timestamp' })
  createdAt!: Date;
}
