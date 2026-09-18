/// <reference types="node" />
import { PrismaClient, RoleName, InventoryItemType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting FlowFactory database seed...');

  // 1. Roles
  console.log('  → Upserting default system roles...');
  const roleDefs = [
    { name: RoleName.ADMIN, description: 'Full system administrator access' },
    { name: RoleName.PURCHASE_MANAGER, description: 'Manages suppliers, purchases, and invoice verification' },
    { name: RoleName.PRODUCTION_MANAGER, description: 'Manages production orders, BOMs, and manufacturing workflows' },
    { name: RoleName.WAREHOUSE_STAFF, description: 'Manages inventory movements, QR scanning, and consumption' },
    { name: RoleName.SALES_TEAM, description: 'Manages sales orders and finished goods dispatch' },
  ];

  const rolesMap: Record<RoleName, string> = {} as Record<RoleName, string>;

  for (const roleDef of roleDefs) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: { name: roleDef.name, description: roleDef.description },
    });
    rolesMap[roleDef.name] = role.id;
  }

  // 2. Permissions
  console.log('  → Upserting permissions matrix...');
  const permissionsList = [
    // Users & Roles
    { name: 'users:read', module: 'users', description: 'View user accounts' },
    { name: 'users:create', module: 'users', description: 'Create user accounts' },
    { name: 'users:update', module: 'users', description: 'Update user accounts' },
    { name: 'users:delete', module: 'users', description: 'Deactivate user accounts' },
    // Inventory
    { name: 'inventory:read', module: 'inventory', description: 'View inventory items and stock levels' },
    { name: 'inventory:create', module: 'inventory', description: 'Create inventory master items' },
    { name: 'inventory:update', module: 'inventory', description: 'Update inventory item metadata' },
    { name: 'inventory:adjust', module: 'inventory', description: 'Perform manual stock adjustments' },
    // Suppliers
    { name: 'suppliers:read', module: 'suppliers', description: 'View supplier directory' },
    { name: 'suppliers:manage', module: 'suppliers', description: 'Create and update suppliers' },
    // Purchases & Invoices
    { name: 'purchases:read', module: 'purchases', description: 'View purchase orders and history' },
    { name: 'purchases:create', module: 'purchases', description: 'Create and confirm purchases' },
    { name: 'invoices:upload', module: 'invoices', description: 'Upload and process OCR invoices' },
    { name: 'invoices:verify', module: 'invoices', description: 'Verify and map extracted invoice items' },
    // Production & Consumption
    { name: 'production:read', module: 'production', description: 'View production orders and BOMs' },
    { name: 'production:create', module: 'production', description: 'Create production orders' },
    { name: 'production:execute', module: 'production', description: 'Start, consume materials, and complete production' },
    // Sales
    { name: 'sales:read', module: 'sales', description: 'View sales orders and finished goods' },
    { name: 'sales:create', module: 'sales', description: 'Create and confirm customer sales' },
    // Reports & Audit
    { name: 'reports:read', module: 'reports', description: 'View operational reports and analytics' },
    { name: 'audit:read', module: 'audit', description: 'View immutable system audit logs' },
  ];

  const permissionsMap: Record<string, string> = {};
  for (const perm of permissionsList) {
    const p = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { module: perm.module, description: perm.description },
      create: perm,
    });
    permissionsMap[perm.name] = p.id;
  }

  // Define role permissions matrix
  const rolePermissionsMatrix: Record<RoleName, string[]> = {
    [RoleName.ADMIN]: permissionsList.map((p) => p.name), // All permissions
    [RoleName.PURCHASE_MANAGER]: [
      'inventory:read',
      'suppliers:read',
      'suppliers:manage',
      'purchases:read',
      'purchases:create',
      'invoices:upload',
      'invoices:verify',
      'reports:read',
    ],
    [RoleName.PRODUCTION_MANAGER]: [
      'inventory:read',
      'inventory:create',
      'inventory:update',
      'inventory:adjust',
      'production:read',
      'production:create',
      'production:execute',
      'reports:read',
    ],
    [RoleName.WAREHOUSE_STAFF]: [
      'inventory:read',
      'inventory:create',
      'inventory:update',
      'inventory:adjust',
      'production:read',
      'production:execute',
    ],
    [RoleName.SALES_TEAM]: [
      'inventory:read',
      'sales:read',
      'sales:create',
    ],
  };

  for (const [roleName, permNames] of Object.entries(rolePermissionsMatrix)) {
    const roleId = rolesMap[roleName as RoleName];
    if (!roleId) continue;
    for (const permName of permNames) {
      const permissionId = permissionsMap[permName];
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
    }
  }

  // 3. Default Admin User
  console.log('  → Upserting default administrator user...');
  const adminEmail = 'admin@flowfactory.local';
  const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: 'Admin',
      lastName: 'User',
      roleId: rolesMap[RoleName.ADMIN],
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      roleId: rolesMap[RoleName.ADMIN],
      isActive: true,
    },
  });

  // 4. Sample Suppliers
  console.log('  → Upserting initial suppliers...');
  const supplier1 = await prisma.supplier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Apex Industrial Supplies',
      contactPerson: 'John Apex',
      email: 'orders@apexsupplies.local',
      phone: '+1-555-0199',
      address: '100 Industrial Parkway, Sector 4',
      taxId: 'TAX-APEX-9921',
      leadTimeDays: 5,
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Prime Metals & Hardware',
      contactPerson: 'Sarah Miller',
      email: 'sales@primemetals.local',
      phone: '+1-555-0244',
      address: '45 Foundry Lane, Suite 12',
      taxId: 'TAX-PRIME-4411',
      leadTimeDays: 7,
    },
  });

  // 5. Sample Inventory Items
  console.log('  → Upserting initial inventory items...');
  const sampleItems = [
    {
      sku: 'RM-STEEL-001',
      name: 'High-Grade Steel Sheet 2mm',
      description: 'Cold rolled steel sheets for fabrication',
      category: 'Raw Materials',
      type: InventoryItemType.RAW_MATERIAL,
      unit: 'SHEET',
      currentStock: 0,
      minStock: 20,
      reorderLevel: 50,
      supplierId: supplier2.id,
    },
    {
      sku: 'RM-WOOD-001',
      name: 'Oak Timber Plank 2x4',
      description: 'Kiln dried treated oak timber plank',
      category: 'Raw Materials',
      type: InventoryItemType.RAW_MATERIAL,
      unit: 'PIECE',
      currentStock: 0,
      minStock: 30,
      reorderLevel: 60,
      supplierId: supplier1.id,
    },
    {
      sku: 'COMP-BOLT-001',
      name: 'M8 Stainless Steel Hex Bolt',
      description: 'M8x40mm grade 316 stainless bolts',
      category: 'Components',
      type: InventoryItemType.COMPONENT,
      unit: 'UNIT',
      currentStock: 0,
      minStock: 100,
      reorderLevel: 250,
      supplierId: supplier2.id,
    },
    {
      sku: 'FG-CHAIR-001',
      name: 'Ergonomic Industrial Chair',
      description: 'Manufactured ergonomic workstation chair',
      category: 'Finished Goods',
      type: InventoryItemType.FINISHED_GOOD,
      unit: 'UNIT',
      currentStock: 0,
      minStock: 5,
      reorderLevel: 15,
      supplierId: null,
    },
  ];

  for (const item of sampleItems) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        description: item.description,
        category: item.category,
        type: item.type,
        unit: item.unit,
        minStock: item.minStock,
        reorderLevel: item.reorderLevel,
      },
      create: item,
    });
  }

  console.log('✅ FlowFactory database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
