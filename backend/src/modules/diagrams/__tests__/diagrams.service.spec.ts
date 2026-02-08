/**
 * Unit Tests for DiagramsService
 *
 * Tests all CRUD operations and query methods for the diagrams service.
 * Uses Jest mocking to isolate service logic from database operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DiagramsService } from '../diagrams.service';
import { CreateDiagramDto } from '../dto/create-diagram.dto';
import { UpdateDiagramDto } from '../dto/update-diagram.dto';

// Mock the db module
jest.mock('../../../db', () => {
  const mockReturning = jest.fn();
  const mockValues = jest.fn(() => ({ returning: mockReturning }));
  const mockSet = jest.fn(() => ({ where: jest.fn(() => ({ returning: mockReturning })) }));
  const mockWhere = jest.fn(() => ({
    limit: jest.fn(),
    orderBy: jest.fn(),
    returning: mockReturning,
  }));
  const mockFrom = jest.fn(() => ({
    where: mockWhere,
    orderBy: jest.fn(),
    limit: jest.fn(),
  }));

  return {
    db: {
      insert: jest.fn(() => ({ values: mockValues })),
      select: jest.fn(() => ({ from: mockFrom })),
      update: jest.fn(() => ({ set: mockSet })),
      delete: jest.fn(() => ({ where: jest.fn() })),
    },
    diagrams: {
      id: 'id',
      title: 'title',
      type: 'type',
      mermaidSource: 'mermaid_source',
      theme: 'theme',
      createdBy: 'created_by',
      metadata: 'metadata',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  };
});

// Import after mocking
import { db, diagrams } from '../../../db';

describe('DiagramsService', () => {
  let service: DiagramsService;
  let mockDb: jest.Mocked<typeof db>;

  // Test fixtures
  const mockDiagram = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Diagram',
    type: 'erDiagram',
    mermaidSource: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
    theme: 'default',
    createdBy: 'user-123',
    metadata: { tags: ['test'] },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockDiagram2 = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    title: 'Second Diagram',
    type: 'flowchart',
    mermaidSource: 'flowchart TD\n  A --> B',
    theme: 'dark',
    createdBy: 'user-456',
    metadata: null,
    createdAt: new Date('2024-01-02T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  };

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DiagramsService],
    }).compile();

    service = module.get<DiagramsService>(DiagramsService);
    mockDb = db as jest.Mocked<typeof db>;
  });

  describe('create', () => {
    it('should create a diagram with required fields', async () => {
      const createDto: CreateDiagramDto = {
        title: 'New Diagram',
        mermaidSource: 'erDiagram\n  USER ||--o{ POST : creates',
      };

      const expectedResult = {
        ...mockDiagram,
        title: createDto.title,
        mermaidSource: createDto.mermaidSource,
      };

      // Setup mock chain
      const mockReturning = jest.fn().mockResolvedValue([expectedResult]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await service.create(createDto);

      expect(mockDb.insert).toHaveBeenCalledWith(diagrams);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createDto.title,
          type: 'erDiagram',
          mermaidSource: createDto.mermaidSource,
          theme: 'default',
        }),
      );
      expect(result).toEqual(expectedResult);
    });

    it('should create a diagram with all optional fields', async () => {
      const createDto: CreateDiagramDto = {
        title: 'Full Diagram',
        mermaidSource: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
        type: 'flowchart',
        theme: 'dark',
        createdBy: 'user-123',
        metadata: { version: 1 },
      };

      const expectedResult = {
        ...mockDiagram,
        ...createDto,
      };

      const mockReturning = jest.fn().mockResolvedValue([expectedResult]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await service.create(createDto);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createDto.title,
          type: createDto.type,
          mermaidSource: createDto.mermaidSource,
          theme: createDto.theme,
          createdBy: createDto.createdBy,
          metadata: createDto.metadata,
        }),
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all diagrams ordered by updatedAt desc', async () => {
      const diagrams = [mockDiagram2, mockDiagram]; // Newest first

      const mockOrderBy = jest.fn().mockResolvedValue(diagrams);
      const mockFrom = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findAll();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(diagrams);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no diagrams exist', async () => {
      const mockOrderBy = jest.fn().mockResolvedValue([]);
      const mockFrom = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a diagram when found', async () => {
      const mockLimit = jest.fn().mockResolvedValue([mockDiagram]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findOne(mockDiagram.id);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockDiagram);
    });

    it('should throw NotFoundException when diagram not found', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      await expect(service.findOne(nonExistentId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        `Diagram with ID "${nonExistentId}" not found`,
      );
    });
  });

  describe('update', () => {
    it('should update a diagram with partial data', async () => {
      const updateDto: UpdateDiagramDto = {
        title: 'Updated Title',
      };

      const updatedDiagram = {
        ...mockDiagram,
        title: updateDto.title,
        updatedAt: new Date(),
      };

      // Mock findOne first
      const mockLimit = jest.fn().mockResolvedValue([mockDiagram]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });

      // Mock update chain
      const mockUpdateReturning = jest.fn().mockResolvedValue([updatedDiagram]);
      const mockUpdateWhere = jest.fn().mockReturnValue({ returning: mockUpdateReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });

      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await service.update(mockDiagram.id, updateDto);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          title: updateDto.title,
        }),
      );
      expect(result).toEqual(updatedDiagram);
    });

    it('should update all fields when provided', async () => {
      const updateDto: UpdateDiagramDto = {
        title: 'Updated Title',
        type: 'flowchart',
        mermaidSource: 'flowchart LR\n  A --> B',
        theme: 'forest',
        metadata: { updated: true },
      };

      const updatedDiagram = {
        ...mockDiagram,
        ...updateDto,
        updatedAt: new Date(),
      };

      // Mock findOne first
      const mockLimit = jest.fn().mockResolvedValue([mockDiagram]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });

      // Mock update chain
      const mockUpdateReturning = jest.fn().mockResolvedValue([updatedDiagram]);
      const mockUpdateWhere = jest.fn().mockReturnValue({ returning: mockUpdateReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });

      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await service.update(mockDiagram.id, updateDto);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          title: updateDto.title,
          type: updateDto.type,
          mermaidSource: updateDto.mermaidSource,
          theme: updateDto.theme,
          metadata: updateDto.metadata,
        }),
      );
      expect(result).toEqual(updatedDiagram);
    });

    it('should throw NotFoundException when updating non-existent diagram', async () => {
      const updateDto: UpdateDiagramDto = {
        title: 'Updated Title',
      };

      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });

      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      await expect(service.update(nonExistentId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a diagram and return confirmation', async () => {
      // Mock findOne first
      const mockLimit = jest.fn().mockResolvedValue([mockDiagram]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });

      // Mock delete chain
      const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);

      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });
      (mockDb.delete as jest.Mock).mockReturnValue({ where: mockDeleteWhere });

      const result = await service.remove(mockDiagram.id);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true, id: mockDiagram.id });
    });

    it('should throw NotFoundException when deleting non-existent diagram', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });

      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      await expect(service.remove(nonExistentId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return diagrams for a specific user', async () => {
      const userDiagrams = [mockDiagram]; // Only diagrams by user-123

      const mockOrderBy = jest.fn().mockResolvedValue(userDiagrams);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findByUser('user-123');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(userDiagrams);
    });

    it('should return empty array when user has no diagrams', async () => {
      const mockOrderBy = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findByUser('unknown-user');

      expect(result).toEqual([]);
    });
  });

  describe('findByType', () => {
    it('should return diagrams of a specific type', async () => {
      const erDiagrams = [mockDiagram];

      const mockOrderBy = jest.fn().mockResolvedValue(erDiagrams);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findByType('erDiagram');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(erDiagrams);
    });

    it('should return empty array when no diagrams of type exist', async () => {
      const mockOrderBy = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findByType('pie');

      expect(result).toEqual([]);
    });

    it('should handle multiple diagrams of same type', async () => {
      const flowchartDiagrams = [
        { ...mockDiagram, type: 'flowchart' },
        mockDiagram2,
      ];

      const mockOrderBy = jest.fn().mockResolvedValue(flowchartDiagrams);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findByType('flowchart');

      expect(result).toHaveLength(2);
      expect(result).toEqual(flowchartDiagrams);
    });
  });

  describe('edge cases', () => {
    it('should handle diagram with minimal data', async () => {
      const minimalDiagram = {
        id: '323e4567-e89b-12d3-a456-426614174002',
        title: 'Minimal',
        type: 'erDiagram',
        mermaidSource: 'erDiagram',
        theme: 'default',
        createdBy: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLimit = jest.fn().mockResolvedValue([minimalDiagram]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findOne(minimalDiagram.id);

      expect(result).toEqual(minimalDiagram);
      expect(result.createdBy).toBeNull();
      expect(result.metadata).toBeNull();
    });

    it('should handle diagram with complex metadata', async () => {
      const complexMetadata = {
        tags: ['production', 'api'],
        config: {
          showGrid: true,
          layout: 'TB',
          nested: { deep: { value: 42 } },
        },
        collaborators: ['user-1', 'user-2'],
      };

      const diagramWithMetadata = {
        ...mockDiagram,
        metadata: complexMetadata,
      };

      const mockLimit = jest.fn().mockResolvedValue([diagramWithMetadata]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findOne(mockDiagram.id);

      expect(result.metadata).toEqual(complexMetadata);
    });

    it('should handle large mermaid source content', async () => {
      const largeMermaidSource = `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
    PRODUCT ||--o{ LINE-ITEM : includes
    INVENTORY ||--|| PRODUCT : tracks
    WAREHOUSE ||--|{ INVENTORY : stores
    SUPPLIER ||--o{ PRODUCT : supplies
    CATEGORY ||--o{ PRODUCT : categorizes
    REVIEW ||--|| CUSTOMER : writes
    REVIEW ||--|| PRODUCT : about
    ${Array(100)
      .fill(null)
      .map((_, i) => `    ENTITY_${i} ||--o{ RELATION_${i} : has`)
      .join('\n')}
  `;

      const largeDiagram = {
        ...mockDiagram,
        mermaidSource: largeMermaidSource,
      };

      const mockReturning = jest.fn().mockResolvedValue([largeDiagram]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const createDto: CreateDiagramDto = {
        title: 'Large Diagram',
        mermaidSource: largeMermaidSource,
      };

      const result = await service.create(createDto);

      expect(result.mermaidSource).toBe(largeMermaidSource);
      expect(result.mermaidSource.length).toBeGreaterThan(1000);
    });
  });
});
