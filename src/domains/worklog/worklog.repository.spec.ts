import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorklogRepository } from './worklog.repository';
import { Worklog } from './entities/worklog.entity';

describe('WorklogRepository', () => {
  let repository: WorklogRepository;
  let mockRepo: Partial<Repository<Worklog>>;

  beforeEach(async () => {
    mockRepo = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorklogRepository,
        { provide: getRepositoryToken(Worklog), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<WorklogRepository>(WorklogRepository);
  });

  describe('saveWorklog', () => {
    // Given: worklog 데이터가 주어졌을 때
    // When: saveWorklog를 호출하면
    // Then: repo.save가 호출된다
    test('worklog를 저장한다', async () => {
      // Given
      const worklog = { id: 'page1', title: 'Test', content: 'content' };

      // When
      await repository.saveWorklog(worklog);

      // Then
      expect(mockRepo.save).toHaveBeenCalledWith(worklog);
    });
  });

  describe('saveWorklogs', () => {
    // Given: 여러 worklog가 주어졌을 때
    // When: saveWorklogs를 호출하면
    // Then: 모든 worklog가 저장된다
    test('여러 worklog를 저장한다', async () => {
      // Given
      const worklogs = [
        { id: 'page1', title: 'Test1', content: 'content1' },
        { id: 'page2', title: 'Test2', content: 'content2' },
      ];

      // When
      await repository.saveWorklogs(worklogs);

      // Then
      expect(mockRepo.save).toHaveBeenCalledWith(worklogs);
    });
  });

  describe('findAll', () => {
    // Given: worklog가 저장되어 있을 때
    // When: findAll을 호출하면
    // Then: 모든 worklog를 반환한다
    test('모든 worklog를 조회한다', async () => {
      // Given
      const worklogs = [{ id: 'page1', title: 'Test' }];
      (mockRepo.find as jest.Mock).mockResolvedValue(worklogs);

      // When
      const result = await repository.findAll();

      // Then
      expect(result).toEqual(worklogs);
    });
  });

  describe('getStatus', () => {
    // Given: worklog가 저장되어 있을 때
    // When: getStatus를 호출하면
    // Then: 총 worklog 수를 반환한다
    test('상태 정보를 반환한다', async () => {
      // Given
      (mockRepo.count as jest.Mock).mockResolvedValue(10);

      // When
      const result = await repository.getStatus();

      // Then
      expect(result).toEqual({ totalWorklogs: 10 });
    });
  });

  describe('findByIds', () => {
    // Given: 여러 worklog ID가 주어졌을 때
    // When: findByIds를 호출하면
    // Then: 해당 ID의 worklog들을 반환한다
    test('ID 목록으로 worklog를 조회한다', async () => {
      // Given
      const worklogs = [
        { id: 'page1', title: 'Test1', content: 'content1' },
        { id: 'page2', title: 'Test2', content: 'content2' },
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(worklogs);

      // When
      const result = await repository.findByIds(['page1', 'page2']);

      // Then
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
      });
      expect(result).toEqual(worklogs);
    });

    // Given: 빈 ID 배열이 주어졌을 때
    // When: findByIds를 호출하면
    // Then: 빈 배열을 반환한다
    test('빈 ID 배열이면 빈 배열을 반환한다', async () => {
      // When
      const result = await repository.findByIds([]);

      // Then
      expect(mockRepo.find).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
