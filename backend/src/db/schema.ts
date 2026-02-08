/**
 * Drizzle ORM Schema for ER Viewer
 *
 * Defines the database schema for:
 * - diagrams: Main diagram storage with Mermaid source
 * - diagram_versions: Version snapshots for history/restore
 * - diagram_blocks: Parent-child relationships for nested ER blocks
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Diagrams table - stores the main diagram data
 */
export const diagrams = pgTable(
  'diagrams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    type: text('type').notNull().default('erDiagram'),
    mermaidSource: text('mermaid_source').notNull(),
    theme: text('theme').default('default'),
    createdBy: text('created_by'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('diagrams_created_by_idx').on(table.createdBy),
    index('diagrams_type_idx').on(table.type),
    index('diagrams_updated_at_idx').on(table.updatedAt),
  ],
);

/**
 * Diagram versions table - stores version snapshots for history/restore
 */
export const diagramVersions = pgTable(
  'diagram_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    diagramId: uuid('diagram_id')
      .references(() => diagrams.id, { onDelete: 'cascade' })
      .notNull(),
    mermaidSource: text('mermaid_source').notNull(),
    versionLabel: text('version_label'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('diagram_versions_diagram_id_idx').on(table.diagramId),
    index('diagram_versions_created_at_idx').on(table.createdAt),
  ],
);

/**
 * Diagram blocks table - stores parent-child relationships for nested ER blocks
 *
 * Each block represents a link from an entity in a parent diagram to a child diagram.
 * The parentEntityKey is the identifier used in the %%block: directive.
 */
export const diagramBlocks = pgTable(
  'diagram_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentDiagramId: uuid('parent_diagram_id')
      .references(() => diagrams.id, { onDelete: 'cascade' })
      .notNull(),
    parentEntityKey: text('parent_entity_key').notNull(),
    childDiagramId: uuid('child_diagram_id')
      .references(() => diagrams.id, { onDelete: 'cascade' })
      .notNull(),
    label: text('label'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('diagram_blocks_parent_diagram_id_idx').on(table.parentDiagramId),
    index('diagram_blocks_child_diagram_id_idx').on(table.childDiagramId),
    // Ensure unique entity key per parent diagram
    uniqueIndex('diagram_blocks_parent_entity_unique_idx').on(
      table.parentDiagramId,
      table.parentEntityKey,
    ),
  ],
);

// Relations for type-safe queries with Drizzle

export const diagramsRelations = relations(diagrams, ({ many }) => ({
  versions: many(diagramVersions),
  childBlocks: many(diagramBlocks, { relationName: 'parentDiagram' }),
  parentBlocks: many(diagramBlocks, { relationName: 'childDiagram' }),
}));

export const diagramVersionsRelations = relations(
  diagramVersions,
  ({ one }) => ({
    diagram: one(diagrams, {
      fields: [diagramVersions.diagramId],
      references: [diagrams.id],
    }),
  }),
);

export const diagramBlocksRelations = relations(diagramBlocks, ({ one }) => ({
  parentDiagram: one(diagrams, {
    fields: [diagramBlocks.parentDiagramId],
    references: [diagrams.id],
    relationName: 'parentDiagram',
  }),
  childDiagram: one(diagrams, {
    fields: [diagramBlocks.childDiagramId],
    references: [diagrams.id],
    relationName: 'childDiagram',
  }),
}));

// Type exports for use in services
export type Diagram = typeof diagrams.$inferSelect;
export type NewDiagram = typeof diagrams.$inferInsert;

export type DiagramVersion = typeof diagramVersions.$inferSelect;
export type NewDiagramVersion = typeof diagramVersions.$inferInsert;

export type DiagramBlock = typeof diagramBlocks.$inferSelect;
export type NewDiagramBlock = typeof diagramBlocks.$inferInsert;
