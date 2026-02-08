/**
 * Unit Tests for BlocksService
 *
 * Tests all CRUD operations, circular reference detection, and ancestry
 * methods for the diagram blocks service.
 * Uses Jest mocking to isolate service logic from database operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BlocksService } from '../blocks.service';
import { DiagramsService } from '../diagrams.service';
import { CreateBlockDto, UpdateBlockDto } from '../dto/create-block.dto';

// Mock the db module
jest.mock('../../../db', () => {
  const mockReturning = jest.fn();
  const mockValues = jest.fn(() => ({ returning: mockReturning }));
  const mockSet = jest.fn(() => ({
    where: jest.fn(() => ({ returning: mockReturning })),
  }));
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
      delete: jest.fn(() => ({ where: jest.fn(() => ({ returning: mockReturning })) })),
    },
    diagramBlocks: {
      id: 'id',
      parentDiagramId: 'parent_diagram_id',
      parentEntityKey: 'parent_entity_key',
      childDiagramId: 'child_diagram_id',
      label: 'label',
      createdBy: 'created_by',
      createdAt: 'created_at',
    },
    diagrams: {
      id: 'id',
    },
  };
});

// Import after mocking
import { db, diagramBlocks } from '../../../db';

describe('BlocksService', () => {
  let service: BlocksService;
  let mockDb: jest.Mocked<typeof db>;
  let mockDiagramsService: jest.Mocked<DiagramsService>;

  // Test fixtures
  const mockDiagramParent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Parent Diagram',
    type: 'erDiagram',
    mermaidSource: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
    theme: 'default',
    createdBy: 'user-123',
    metadata: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockDiagramChild = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    title: 'Child Diagram',
    type: 'erDiagram',
    mermaidSource: 'erDiagram\n  ORDER ||--|{ LINE_ITEM : contains',
    theme: 'default',
    createdBy: 'user-123',
    metadata: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockDiagramGrandchild = {
    id: '323e4567-e89b-12d3-a456-426614174002',
    title: 'Grandchild Diagram',
    type: 'erDiagram',
    mermaidSource: 'erDiagram\n  LINE_ITEM ||--|| PRODUCT : references',
    theme: 'default',
    createdBy: 'user-123',
    metadata: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockBlock = {
    id: '423e4567-e89b-12d3-a456-426614174003',
    parentDiagramId: mockDiagramParent.id,
    parentEntityKey: 'CUSTOMER',
    childDiagramId: mockDiagramChild.id,
    label: 'Customer Details',
    createdBy: 'user-123',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockBlock2 = {
    id: '523e4567-e89b-12d3-a456-426614174004',
    parentDiagramId: mockDiagramParent.id,
    parentEntityKey: 'ORDER',
    childDiagramId: mockDiagramChild.id,
    label: null,
    createdBy: 'user-123',
    createdAt: new Date('2024-01-02T00:00:00Z'),
  };

  const mockBlockChildToGrandchild = {
    id: '623e4567-e89b-12d3-a456-426614174005',
    parentDiagramId: mockDiagramChild.id,
    parentEntityKey: 'LINE_ITEM',
    childDiagramId: mockDiagramGrandchild.id,
    label: 'Line Item Details',
    createdBy: 'user-123',
    createdAt: new Date('2024-01-03T00:00:00Z'),
  };

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock DiagramsService
    mockDiagramsService = {
      findOne: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<DiagramsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocksService,
        {
          provide: DiagramsService,
          useValue: mockDiagramsService,
        },
      ],
    }).compile();

    service = module.get<BlocksService>(BlocksService);
    mockDb = db as jest.Mocked<typeof db>;
  });

  describe('create', () => {
    it('should create a block with all required fields', async () => {
      const createDto: CreateBlockDto = {
        parentEntityKey: 'CUSTOMER',
        childDiagramId: mockDiagramChild.id,
      };

      // Mock diagram existence checks
      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockDiagramParent) // Parent exists
        .mockResolvedValueOnce(mockDiagramChild) // Child exists
        .mockResolvedValueOnce(mockDiagramParent); // For ancestry check

      // Mock no existing block for entity key
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockAnd = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = jest.fn().mockReturnValue(mockAnd);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });

      // Mock ancestry path for circular check (no ancestors)
      const mockAncestryLimit = jest.fn().mockResolvedValue([]);
      const mockAncestryWhere = jest.fn().mockReturnValue({ limit: mockAncestryLimit });
      const mockAncestryFrom = jest.fn().mockReturnValue({ where: mockAncestryWhere });

      // Setup mock chain for insert
      const mockReturning = jest.fn().mockResolvedValue([mockBlock]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });

      (mockDb.select as jest.Mock)
        .mockReturnValueOnce({ from: mockAncestryFrom }) // For getAncestryPath
        .mockReturnValueOnce({ from: mockAncestryFrom }) // For getAllDescendants
        .mockReturnValueOnce({ from: mockFrom }); // For findByEntityKey
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await service.create(mockDiagramParent.id, createDto);

      expect(mockDiagramsService.findOne).toHaveBeenCalledWith(mockDiagramParent.id);
      expect(mockDiagramsService.findOne).toHaveBeenCalledWith(createDto.childDiagramId);
      expect(mockDb.insert).toHaveBeenCalledWith(diagramBlocks);
      expect(result).toEqual(mockBlock);
    });

    it('should create a block with optional label', async () => {
      const createDto: CreateBlockDto = {
        parentEntityKey: 'CUSTOMER',
        childDiagramId: mockDiagramChild.id,
        label: 'Customer Details',
        createdBy: 'user-123',
      };

      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockDiagramParent)
        .mockResolvedValueOnce(mockDiagramChild)
        .mockResolvedValueOnce(mockDiagramParent);

      // Mock no circular reference and no existing block
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });

      const mockReturning = jest.fn().mockResolvedValue([mockBlock]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });

      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await service.create(mockDiagramParent.id, createDto);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          parentDiagramId: mockDiagramParent.id,
          parentEntityKey: createDto.parentEntityKey,
          childDiagramId: createDto.childDiagramId,
          label: createDto.label,
          createdBy: createDto.createdBy,
        }),
      );
      expect(result).toEqual(mockBlock);
    });

    it('should throw BadRequestException for self-referencing block', async () => {
      const createDto: CreateBlockDto = {
        parentEntityKey: 'CUSTOMER',
        childDiagramId: mockDiagramParent.id, // Same as parent
      };

      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockDiagramParent)
        .mockResolvedValueOnce(mockDiagramParent);

      await expect(
        service.create(mockDiagramParent.id, createDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockDiagramParent.id, createDto),
      ).rejects.toThrow('Cannot create a block that links a diagram to itself');
    });

    it('should throw ConflictException when entity key already has a block', async () => {
      const createDto: CreateBlockDto = {
        parentEntityKey: 'CUSTOMER',
        childDiagramId: mockDiagramChild.id,
      };

      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockDiagramParent)
        .mockResolvedValueOnce(mockDiagramChild)
        .mockResolvedValueOnce(mockDiagramParent);

      // Mock existing block found
      const mockLimit = jest.fn().mockResolvedValue([mockBlock]);
      const mockAnd = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = jest.fn().mockReturnValue(mockAnd);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });

      // For ancestry check - no ancestors
      const mockAncestryLimit = jest.fn().mockResolvedValue([]);
      const mockAncestryWhere = jest.fn().mockReturnValue({ limit: mockAncestryLimit });
      const mockAncestryFrom = jest.fn().mockReturnValue({ where: mockAncestryWhere });

      (mockDb.select as jest.Mock)
        .mockReturnValueOnce({ from: mockAncestryFrom }) // ancestry
        .mockReturnValueOnce({ from: mockAncestryFrom }) // descendants
        .mockReturnValueOnce({ from: mockFrom }); // existing block check

      await expect(
        service.create(mockDiagramParent.id, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when parent diagram does not exist', async () => {
      const createDto: CreateBlockDto = {
        parentEntityKey: 'CUSTOMER',
        childDiagramId: mockDiagramChild.id,
      };

      mockDiagramsService.findOne.mockRejectedValueOnce(
        new NotFoundException(`Diagram with ID "nonexistent" not found`),
      );

      await expect(service.create('nonexistent', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when child diagram does not exist', async () => {
      const createDto: CreateBlockDto = {
        parentEntityKey: 'CUSTOMER',
        childDiagramId: 'nonexistent',
      };

      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockDiagramParent)
        .mockRejectedValueOnce(
          new NotFoundException(`Diagram with ID "nonexistent" not found`),
        );

      await expect(
        service.create(mockDiagramParent.id, createDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByParent', () => {
    it('should return all blocks for a parent diagram', async () => {
      const blocks = [mockBlock2, mockBlock]; // Ordered by createdAt desc

      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockOrderBy = jest.fn().mockResolvedValue(blocks);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findAllByParent(mockDiagramParent.id);

      expect(mockDiagramsService.findOne).toHaveBeenCalledWith(mockDiagramParent.id);
      expect(result).toEqual(blocks);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no blocks exist', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockOrderBy = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findAllByParent(mockDiagramParent.id);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when diagram does not exist', async () => {
      mockDiagramsService.findOne.mockRejectedValue(
        new NotFoundException(`Diagram with ID "nonexistent" not found`),
      );

      await expect(service.findAllByParent('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllByChild', () => {
    it('should return all blocks where diagram is the child', async () => {
      const blocks = [mockBlock];

      mockDiagramsService.findOne.mockResolvedValue(mockDiagramChild);

      const mockOrderBy = jest.fn().mockResolvedValue(blocks);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findAllByChild(mockDiagramChild.id);

      expect(mockDiagramsService.findOne).toHaveBeenCalledWith(mockDiagramChild.id);
      expect(result).toEqual(blocks);
    });

    it('should return empty array when diagram has no parent blocks', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockOrderBy = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findAllByChild(mockDiagramParent.id);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a block when found', async () => {
      const mockLimit = jest.fn().mockResolvedValue([mockBlock]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findOne(mockBlock.id);

      expect(result).toEqual(mockBlock);
    });

    it('should throw NotFoundException when block not found', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        `Block with ID "${nonExistentId}" not found`,
      );
    });
  });

  describe('findOneByParent', () => {
    it('should return block when it belongs to the parent diagram', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockLimit = jest.fn().mockResolvedValue([mockBlock]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findOneByParent(
        mockDiagramParent.id,
        mockBlock.id,
      );

      expect(result).toEqual(mockBlock);
    });

    it('should throw NotFoundException when block does not belong to parent', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramChild);

      // Block exists but belongs to different parent
      const mockLimit = jest.fn().mockResolvedValue([mockBlock]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await expect(
        service.findOneByParent(mockDiagramChild.id, mockBlock.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEntityKey', () => {
    it('should return block when entity key exists', async () => {
      const mockLimit = jest.fn().mockResolvedValue([mockBlock]);
      const mockAnd = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = jest.fn().mockReturnValue(mockAnd);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findByEntityKey(
        mockDiagramParent.id,
        'CUSTOMER',
      );

      expect(result).toEqual(mockBlock);
    });

    it('should return null when entity key has no block', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockAnd = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = jest.fn().mockReturnValue(mockAnd);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findByEntityKey(
        mockDiagramParent.id,
        'NONEXISTENT',
      );

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update block label', async () => {
      const updateDto: UpdateBlockDto = {
        label: 'Updated Label',
      };

      const updatedBlock = {
        ...mockBlock,
        label: updateDto.label,
      };

      // Mock findOneByParent
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockLimit = jest.fn().mockResolvedValue([mockBlock]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });

      // Mock update chain
      const mockUpdateReturning = jest.fn().mockResolvedValue([updatedBlock]);
      const mockUpdateWhere = jest.fn().mockReturnValue({ returning: mockUpdateReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });

      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await service.update(
        mockDiagramParent.id,
        mockBlock.id,
        updateDto,
      );

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          label: updateDto.label,
        }),
      );
      expect(result).toEqual(updatedBlock);
    });

    it('should update childDiagramId with circular reference check', async () => {
      const updateDto: UpdateBlockDto = {
        childDiagramId: mockDiagramGrandchild.id,
      };

      const updatedBlock = {
        ...mockBlock,
        childDiagramId: updateDto.childDiagramId,
      };

      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockDiagramParent) // findOneByParent
        .mockResolvedValueOnce(mockDiagramGrandchild) // verify new child exists
        .mockResolvedValueOnce(mockDiagramParent); // ancestry check

      // Mock findOne for block
      const mockLimit = jest.fn().mockResolvedValue([mockBlock]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });

      // Mock ancestry path check (no ancestors)
      const mockAncestryLimit = jest.fn().mockResolvedValue([]);
      const mockAncestryWhere = jest.fn().mockReturnValue({ limit: mockAncestryLimit });
      const mockAncestryFrom = jest.fn().mockReturnValue({ where: mockAncestryWhere });

      // Mock update chain
      const mockUpdateReturning = jest.fn().mockResolvedValue([updatedBlock]);
      const mockUpdateWhere = jest.fn().mockReturnValue({ returning: mockUpdateReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });

      (mockDb.select as jest.Mock)
        .mockReturnValueOnce({ from: mockSelectFrom }) // findOne
        .mockReturnValueOnce({ from: mockAncestryFrom }) // ancestry
        .mockReturnValueOnce({ from: mockAncestryFrom }); // descendants
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await service.update(
        mockDiagramParent.id,
        mockBlock.id,
        updateDto,
      );

      expect(result.childDiagramId).toEqual(updateDto.childDiagramId);
    });

    it('should return existing block when no updates provided', async () => {
      const updateDto: UpdateBlockDto = {};

      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockLimit = jest.fn().mockResolvedValue([mockBlock]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });

      const result = await service.update(
        mockDiagramParent.id,
        mockBlock.id,
        updateDto,
      );

      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockBlock);
    });

    it('should throw BadRequestException when updating to self-reference', async () => {
      const updateDto: UpdateBlockDto = {
        childDiagramId: mockDiagramParent.id, // Same as parent
      };

      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockDiagramParent)
        .mockResolvedValueOnce(mockDiagramParent);

      const mockLimit = jest.fn().mockResolvedValue([mockBlock]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });

      await expect(
        service.update(mockDiagramParent.id, mockBlock.id, updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a block and return confirmation', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockLimit = jest.fn().mockResolvedValue([mockBlock]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });

      const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);

      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });
      (mockDb.delete as jest.Mock).mockReturnValue({ where: mockDeleteWhere });

      const result = await service.remove(mockDiagramParent.id, mockBlock.id);

      expect(mockDb.delete).toHaveBeenCalledWith(diagramBlocks);
      expect(result).toEqual({ deleted: true, id: mockBlock.id });
    });

    it('should throw NotFoundException when block does not exist', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });

      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      await expect(
        service.remove(mockDiagramParent.id, nonExistentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAllByParent', () => {
    it('should delete all blocks for a parent diagram', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockReturning = jest.fn().mockResolvedValue([mockBlock, mockBlock2]);
      const mockDeleteWhere = jest.fn().mockReturnValue({ returning: mockReturning });

      (mockDb.delete as jest.Mock).mockReturnValue({ where: mockDeleteWhere });

      const result = await service.removeAllByParent(mockDiagramParent.id);

      expect(mockDiagramsService.findOne).toHaveBeenCalledWith(mockDiagramParent.id);
      expect(mockDb.delete).toHaveBeenCalledWith(diagramBlocks);
      expect(result).toEqual({ deleted: 2 });
    });

    it('should return zero deleted when no blocks exist', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockReturning = jest.fn().mockResolvedValue([]);
      const mockDeleteWhere = jest.fn().mockReturnValue({ returning: mockReturning });

      (mockDb.delete as jest.Mock).mockReturnValue({ where: mockDeleteWhere });

      const result = await service.removeAllByParent(mockDiagramParent.id);

      expect(result).toEqual({ deleted: 0 });
    });
  });

  describe('countByParent', () => {
    it('should return count of blocks for a parent diagram', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockWhere = jest.fn().mockResolvedValue([mockBlock, mockBlock2]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.countByParent(mockDiagramParent.id);

      expect(result).toBe(2);
    });

    it('should return zero when no blocks exist', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      const mockWhere = jest.fn().mockResolvedValue([]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.countByParent(mockDiagramParent.id);

      expect(result).toBe(0);
    });
  });

  describe('getAncestryPath', () => {
    it('should return path with only diagram when it has no parents', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramParent);

      // No parent block found
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.getAncestryPath(mockDiagramParent.id);

      expect(result).toEqual([mockDiagramParent.id]);
    });

    it('should return full ancestry path for nested diagram', async () => {
      mockDiagramsService.findOne.mockResolvedValue(mockDiagramGrandchild);

      // Mock parent block lookup chain
      const mockLimit1 = jest
        .fn()
        .mockResolvedValue([mockBlockChildToGrandchild]);
      const mockWhere1 = jest.fn().mockReturnValue({ limit: mockLimit1 });
      const mockFrom1 = jest.fn().mockReturnValue({ where: mockWhere1 });

      const mockLimit2 = jest.fn().mockResolvedValue([mockBlock]);
      const mockWhere2 = jest.fn().mockReturnValue({ limit: mockLimit2 });
      const mockFrom2 = jest.fn().mockReturnValue({ where: mockWhere2 });

      const mockLimit3 = jest.fn().mockResolvedValue([]);
      const mockWhere3 = jest.fn().mockReturnValue({ limit: mockLimit3 });
      const mockFrom3 = jest.fn().mockReturnValue({ where: mockWhere3 });

      (mockDb.select as jest.Mock)
        .mockReturnValueOnce({ from: mockFrom1 }) // grandchild -> child
        .mockReturnValueOnce({ from: mockFrom2 }) // child -> parent
        .mockReturnValueOnce({ from: mockFrom3 }); // parent -> (no more)

      const result = await service.getAncestryPath(mockDiagramGrandchild.id);

      expect(result).toEqual([
        mockDiagramParent.id,
        mockDiagramChild.id,
        mockDiagramGrandchild.id,
      ]);
    });
  });

  describe('circular reference detection', () => {
    it('should detect circular reference when child is ancestor of parent', async () => {
      const createDto: CreateBlockDto = {
        parentEntityKey: 'LINE_ITEM',
        childDiagramId: mockDiagramParent.id, // Trying to link grandchild -> parent (circular)
      };

      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockDiagramGrandchild)
        .mockResolvedValueOnce(mockDiagramParent)
        .mockResolvedValueOnce(mockDiagramGrandchild);

      // Mock ancestry path showing parent is ancestor
      const mockLimit1 = jest
        .fn()
        .mockResolvedValue([mockBlockChildToGrandchild]);
      const mockWhere1 = jest.fn().mockReturnValue({ limit: mockLimit1 });
      const mockFrom1 = jest.fn().mockReturnValue({ where: mockWhere1 });

      const mockLimit2 = jest.fn().mockResolvedValue([mockBlock]);
      const mockWhere2 = jest.fn().mockReturnValue({ limit: mockLimit2 });
      const mockFrom2 = jest.fn().mockReturnValue({ where: mockWhere2 });

      const mockLimit3 = jest.fn().mockResolvedValue([]);
      const mockWhere3 = jest.fn().mockReturnValue({ limit: mockLimit3 });
      const mockFrom3 = jest.fn().mockReturnValue({ where: mockWhere3 });

      (mockDb.select as jest.Mock)
        .mockReturnValueOnce({ from: mockFrom1 })
        .mockReturnValueOnce({ from: mockFrom2 })
        .mockReturnValueOnce({ from: mockFrom3 });

      await expect(
        service.create(mockDiagramGrandchild.id, createDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockDiagramGrandchild.id, createDto),
      ).rejects.toThrow('circular reference');
    });

    it('should allow non-circular references', async () => {
      const createDto: CreateBlockDto = {
        parentEntityKey: 'PRODUCT',
        childDiagramId: mockDiagramGrandchild.id,
      };

      // Create a new diagram that's not in the hierarchy
      const mockUnrelatedDiagram = {
        ...mockDiagramParent,
        id: '723e4567-e89b-12d3-a456-426614174006',
        title: 'Unrelated Diagram',
      };

      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockUnrelatedDiagram) // parent
        .mockResolvedValueOnce(mockDiagramGrandchild) // child
        .mockResolvedValueOnce(mockUnrelatedDiagram); // ancestry

      // No ancestors for unrelated diagram
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });

      const mockReturning = jest.fn().mockResolvedValue([
        {
          ...mockBlock,
          parentDiagramId: mockUnrelatedDiagram.id,
          childDiagramId: mockDiagramGrandchild.id,
        },
      ]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });

      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await service.create(mockUnrelatedDiagram.id, createDto);

      expect(result.childDiagramId).toBe(mockDiagramGrandchild.id);
    });
  });

  describe('edge cases', () => {
    it('should handle block with null label', async () => {
      const blockWithNullLabel = { ...mockBlock, label: null };

      const mockLimit = jest.fn().mockResolvedValue([blockWithNullLabel]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findOne(mockBlock.id);

      expect(result.label).toBeNull();
    });

    it('should handle entity keys with special characters', async () => {
      const createDto: CreateBlockDto = {
        parentEntityKey: 'ORDER_LINE_ITEM',
        childDiagramId: mockDiagramChild.id,
      };

      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockDiagramParent)
        .mockResolvedValueOnce(mockDiagramChild)
        .mockResolvedValueOnce(mockDiagramParent);

      const specialBlock = {
        ...mockBlock,
        parentEntityKey: 'ORDER_LINE_ITEM',
      };

      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });

      const mockReturning = jest.fn().mockResolvedValue([specialBlock]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });

      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await service.create(mockDiagramParent.id, createDto);

      expect(result.parentEntityKey).toBe('ORDER_LINE_ITEM');
    });

    it('should handle long labels', async () => {
      const longLabel = 'A'.repeat(255);
      const createDto: CreateBlockDto = {
        parentEntityKey: 'CUSTOMER',
        childDiagramId: mockDiagramChild.id,
        label: longLabel,
      };

      mockDiagramsService.findOne
        .mockResolvedValueOnce(mockDiagramParent)
        .mockResolvedValueOnce(mockDiagramChild)
        .mockResolvedValueOnce(mockDiagramParent);

      const blockWithLongLabel = {
        ...mockBlock,
        label: longLabel,
      };

      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });

      const mockReturning = jest.fn().mockResolvedValue([blockWithLongLabel]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });

      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await service.create(mockDiagramParent.id, createDto);

      expect(result.label).toBe(longLabel);
      expect(result.label?.length).toBe(255);
    });
  });
});
