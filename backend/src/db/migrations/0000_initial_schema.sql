-- Migration: 0000_initial_schema
-- Description: Create initial database schema for ER Viewer
-- Tables: diagrams, diagram_versions, diagram_blocks

-- Create diagrams table
CREATE TABLE IF NOT EXISTS "diagrams" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" text NOT NULL,
    "type" text NOT NULL DEFAULT 'erDiagram',
    "mermaid_source" text NOT NULL,
    "theme" text DEFAULT 'default',
    "created_by" text,
    "metadata" jsonb,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create diagram_versions table
CREATE TABLE IF NOT EXISTS "diagram_versions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "diagram_id" uuid NOT NULL REFERENCES "diagrams"("id") ON DELETE CASCADE,
    "mermaid_source" text NOT NULL,
    "version_label" text,
    "created_by" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create diagram_blocks table
CREATE TABLE IF NOT EXISTS "diagram_blocks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "parent_diagram_id" uuid NOT NULL REFERENCES "diagrams"("id") ON DELETE CASCADE,
    "parent_entity_key" text NOT NULL,
    "child_diagram_id" uuid NOT NULL REFERENCES "diagrams"("id") ON DELETE CASCADE,
    "label" text,
    "created_by" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for diagrams table
CREATE INDEX IF NOT EXISTS "diagrams_created_by_idx" ON "diagrams" ("created_by");
CREATE INDEX IF NOT EXISTS "diagrams_type_idx" ON "diagrams" ("type");
CREATE INDEX IF NOT EXISTS "diagrams_updated_at_idx" ON "diagrams" ("updated_at");

-- Create indexes for diagram_versions table
CREATE INDEX IF NOT EXISTS "diagram_versions_diagram_id_idx" ON "diagram_versions" ("diagram_id");
CREATE INDEX IF NOT EXISTS "diagram_versions_created_at_idx" ON "diagram_versions" ("created_at");

-- Create indexes for diagram_blocks table
CREATE INDEX IF NOT EXISTS "diagram_blocks_parent_diagram_id_idx" ON "diagram_blocks" ("parent_diagram_id");
CREATE INDEX IF NOT EXISTS "diagram_blocks_child_diagram_id_idx" ON "diagram_blocks" ("child_diagram_id");
CREATE UNIQUE INDEX IF NOT EXISTS "diagram_blocks_parent_entity_unique_idx" ON "diagram_blocks" ("parent_diagram_id", "parent_entity_key");
