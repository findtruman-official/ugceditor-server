import { Test, TestingModule } from '@nestjs/testing';
import { StoryTaskService } from './story-task.service';

describe('StoryTaskService', () => {
  let service: StoryTaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoryTaskService],
    }).compile();

    service = module.get<StoryTaskService>(StoryTaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
