import { Test, TestingModule } from '@nestjs/testing';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';

describe('IngestController', () => {
  let controller: IngestController;

  const mockIngestService = {
    ingestBatch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestController],
      providers: [{ provide: IngestService, useValue: mockIngestService }],
    }).compile();

    controller = module.get<IngestController>(IngestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
