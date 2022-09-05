import { Test, TestingModule } from '@nestjs/testing';
import { StoryChainTaskService } from './story-chain-task.service';

describe('StoryChainTaskService', () => {
  let service: StoryChainTaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoryChainTaskService],
    }).compile();

    service = module.get<StoryChainTaskService>(StoryChainTaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
