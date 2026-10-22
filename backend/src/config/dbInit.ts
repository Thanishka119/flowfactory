import { prisma } from './db.js';

export async function initAdditiveTables(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS alternate_components (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        alternate_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(original_item_id, alternate_item_id)
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS product_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_number VARCHAR(100) UNIQUE NOT NULL,
        sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
        item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
        quantity NUMERIC(12, 4) NOT NULL,
        reason TEXT NOT NULL,
        condition VARCHAR(50) NOT NULL DEFAULT 'OPEN_BOX',
        inspection_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_INSPECTION',
        inspection_notes TEXT,
        recommended_route VARCHAR(50),
        route_explanation TEXT,
        resale_price NUMERIC(12, 2),
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE product_returns ADD COLUMN IF NOT EXISTS batch_reference TEXT;
      ALTER TABLE product_returns ADD COLUMN IF NOT EXISTS disposition_action VARCHAR(50);
      ALTER TABLE product_returns ADD COLUMN IF NOT EXISTS inventory_status VARCHAR(50) DEFAULT 'HELD_IN_RETURNS';
      ALTER TABLE product_returns ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE;
    `);
  } catch (error) {
    console.error('Error initializing additive tables:', error);
  }
}
