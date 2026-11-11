import {
  PrismaClient,
  RoleName,
  WarehouseType,
  StockMovementType,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting ERP demo seed...');

  // ============================================================
  // ROLES
  // ============================================================

  await prisma.role.createMany({
    data: [
      { name: RoleName.ADMIN },
      { name: RoleName.STOCK_MANAGER },
      { name: RoleName.VIEWER },
    ],
    skipDuplicates: true,
  });

  const adminRole = await prisma.role.findUnique({
    where: { name: RoleName.ADMIN },
  });

  const stockManagerRole = await prisma.role.findUnique({
    where: { name: RoleName.STOCK_MANAGER },
  });

  const viewerRole = await prisma.role.findUnique({
    where: { name: RoleName.VIEWER },
  });

  if (!adminRole || !stockManagerRole || !viewerRole) {
    throw new Error('Required roles were not found');
  }

  // ============================================================
  // USERS
  // ============================================================

  const adminPassword = await argon2.hash('AdminERP2026!');
  const stockManagerPassword = await argon2.hash('StockManager2026!');
  const viewerPassword = await argon2.hash('ViewerERP2026!');

  const admin = await prisma.user.upsert({
    where: {
      email: 'admin@erp.local',
    },
    update: {
      fullName: 'ERP Administrator',
      passwordHash: adminPassword,
      roleId: adminRole.id,
    },
    create: {
      fullName: 'ERP Administrator',
      email: 'admin@erp.local',
      passwordHash: adminPassword,
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: {
      email: 'stock.manager@erp.local',
    },
    update: {
      fullName: 'Sarah Ben Salem',
      passwordHash: stockManagerPassword,
      roleId: stockManagerRole.id,
    },
    create: {
      fullName: 'Sarah Ben Salem',
      email: 'stock.manager@erp.local',
      passwordHash: stockManagerPassword,
      roleId: stockManagerRole.id,
    },
  });

  await prisma.user.upsert({
    where: {
      email: 'viewer@erp.local',
    },
    update: {
      fullName: 'Ahmed Trabelsi',
      passwordHash: viewerPassword,
      roleId: viewerRole.id,
    },
    create: {
      fullName: 'Ahmed Trabelsi',
      email: 'viewer@erp.local',
      passwordHash: viewerPassword,
      roleId: viewerRole.id,
    },
  });

  // ============================================================
  // PRODUCT CATEGORIES
  // ============================================================

  const rawMaterials = await prisma.productCategory.upsert({
    where: { name: 'Raw Materials' },
    update: {},
    create: { name: 'Raw Materials' },
  });

  const finishedGoods = await prisma.productCategory.upsert({
    where: { name: 'Finished Goods' },
    update: {},
    create: { name: 'Finished Goods' },
  });

  const packaging = await prisma.productCategory.upsert({
    where: { name: 'Packaging' },
    update: {},
    create: { name: 'Packaging' },
  });

  const maintenance = await prisma.productCategory.upsert({
    where: { name: 'Maintenance Supplies' },
    update: {},
    create: { name: 'Maintenance Supplies' },
  });

  // ============================================================
  // PRODUCTS
  // ============================================================

  const steelSheet = await prisma.product.upsert({
    where: { reference: 'RM-STEEL-002' },
    update: {
      name: 'Steel Sheet 2mm',
      minStock: 50,
      categoryId: rawMaterials.id,
    },
    create: {
      reference: 'RM-STEEL-002',
      name: 'Steel Sheet 2mm',
      minStock: 50,
      categoryId: rawMaterials.id,
    },
  });

  const industrialMotor = await prisma.product.upsert({
    where: { reference: 'FG-MOTOR-005' },
    update: {
      name: 'Industrial Motor 5kW',
      minStock: 5,
      categoryId: finishedGoods.id,
    },
    create: {
      reference: 'FG-MOTOR-005',
      name: 'Industrial Motor 5kW',
      minStock: 5,
      categoryId: finishedGoods.id,
    },
  });

  const cardboardBox = await prisma.product.upsert({
    where: { reference: 'PK-BOX-4030' },
    update: {
      name: 'Cardboard Box 40x30',
      minStock: 100,
      categoryId: packaging.id,
    },
    create: {
      reference: 'PK-BOX-4030',
      name: 'Cardboard Box 40x30',
      minStock: 100,
      categoryId: packaging.id,
    },
  });

  const hydraulicOil = await prisma.product.upsert({
    where: { reference: 'MT-OIL-20L' },
    update: {
      name: 'Hydraulic Oil 20L',
      minStock: 20,
      categoryId: maintenance.id,
    },
    create: {
      reference: 'MT-OIL-20L',
      name: 'Hydraulic Oil 20L',
      minStock: 20,
      categoryId: maintenance.id,
    },
  });

  const safetyGloves = await prisma.product.upsert({
    where: { reference: 'MT-GLOVE-100' },
    update: {
      name: 'Industrial Safety Gloves',
      minStock: 30,
      categoryId: maintenance.id,
    },
    create: {
      reference: 'MT-GLOVE-100',
      name: 'Industrial Safety Gloves',
      minStock: 30,
      categoryId: maintenance.id,
    },
  });

  // ============================================================
  // WAREHOUSES
  // ============================================================

  const principal = await prisma.warehouse.findFirst({
    where: {
      type: WarehouseType.PRINCIPAL,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const production = await prisma.warehouse.findFirst({
    where: {
      type: WarehouseType.PRODUCTION,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const distribution = await prisma.warehouse.findFirst({
    where: {
      type: WarehouseType.DISTRIBUTION,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const retour = await prisma.warehouse.findFirst({
    where: {
      type: WarehouseType.RETOUR,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const rebut = await prisma.warehouse.findFirst({
    where: {
      type: WarehouseType.REBUT,
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (!principal || !production || !distribution || !retour || !rebut) {
    throw new Error('Required warehouses were not found');
  }

  // ============================================================
  // LOCATIONS
  // ============================================================

  const principalA = await prisma.location.upsert({
    where: {
      warehouseId_code: {
        warehouseId: principal.id,
        code: 'A-01',
      },
    },
    update: {
      name: 'Main Storage A-01',
      description: 'Primary raw material storage area',
    },
    create: {
      warehouseId: principal.id,
      code: 'A-01',
      name: 'Main Storage A-01',
      description: 'Primary raw material storage area',
    },
  });

  const principalB = await prisma.location.upsert({
    where: {
      warehouseId_code: {
        warehouseId: principal.id,
        code: 'B-01',
      },
    },
    update: {
      name: 'Main Storage B-01',
      description: 'Finished goods storage area',
    },
    create: {
      warehouseId: principal.id,
      code: 'B-01',
      name: 'Main Storage B-01',
      description: 'Finished goods storage area',
    },
  });

  const productionA = await prisma.location.upsert({
    where: {
      warehouseId_code: {
        warehouseId: production.id,
        code: 'PROD-01',
      },
    },
    update: {
      name: 'Production Line 01',
      description: 'Production staging area',
    },
    create: {
      warehouseId: production.id,
      code: 'PROD-01',
      name: 'Production Line 01',
      description: 'Production staging area',
    },
  });

  const distributionA = await prisma.location.upsert({
    where: {
      warehouseId_code: {
        warehouseId: distribution.id,
        code: 'DIST-01',
      },
    },
    update: {
      name: 'Distribution Area 01',
      description: 'Ready-to-ship distribution area',
    },
    create: {
      warehouseId: distribution.id,
      code: 'DIST-01',
      name: 'Distribution Area 01',
      description: 'Ready-to-ship distribution area',
    },
  });

  // ============================================================
  // STOCK MOVEMENTS
  // ============================================================

  const movements = [
    {
      reference: 'SEED-IN-001',
      type: StockMovementType.IN,
      quantity: 180,
      productId: steelSheet.id,
      warehouseId: principal.id,
      locationId: principalA.id,
      reason: 'Initial supplier delivery',
    },
    {
      reference: 'SEED-IN-002',
      type: StockMovementType.IN,
      quantity: 12,
      productId: industrialMotor.id,
      warehouseId: principal.id,
      locationId: principalB.id,
      reason: 'Initial finished goods receipt',
    },
    {
      reference: 'SEED-IN-003',
      type: StockMovementType.IN,
      quantity: 300,
      productId: cardboardBox.id,
      warehouseId: principal.id,
      locationId: principalB.id,
      reason: 'Packaging supplier delivery',
    },
    {
      reference: 'SEED-IN-004',
      type: StockMovementType.IN,
      quantity: 45,
      productId: hydraulicOil.id,
      warehouseId: principal.id,
      locationId: principalA.id,
      reason: 'Maintenance supplies delivery',
    },
    {
      reference: 'SEED-IN-005',
      type: StockMovementType.IN,
      quantity: 18,
      productId: safetyGloves.id,
      warehouseId: principal.id,
      locationId: principalA.id,
      reason: 'Safety equipment delivery',
    },
    {
      reference: 'SEED-OUT-001',
      type: StockMovementType.OUT,
      quantity: 40,
      productId: steelSheet.id,
      warehouseId: principal.id,
      locationId: principalA.id,
      reason: 'Production material issue',
    },
    {
      reference: 'SEED-OUT-002',
      type: StockMovementType.OUT,
      quantity: 4,
      productId: industrialMotor.id,
      warehouseId: principal.id,
      locationId: principalB.id,
      reason: 'Customer shipment',
    },
    {
      reference: 'SEED-OUT-003',
      type: StockMovementType.OUT,
      quantity: 150,
      productId: cardboardBox.id,
      warehouseId: principal.id,
      locationId: principalB.id,
      reason: 'Distribution order',
    },
    {
      reference: 'SEED-OUT-004',
      type: StockMovementType.OUT,
      quantity: 10,
      productId: hydraulicOil.id,
      warehouseId: principal.id,
      locationId: principalA.id,
      reason: 'Maintenance consumption',
    },
    {
      reference: 'SEED-IN-006',
      type: StockMovementType.IN,
      quantity: 40,
      productId: steelSheet.id,
      warehouseId: production.id,
      locationId: productionA.id,
      reason: 'Production staging transfer',
    },
    {
      reference: 'SEED-IN-007',
      type: StockMovementType.IN,
      quantity: 8,
      productId: industrialMotor.id,
      warehouseId: distribution.id,
      locationId: distributionA.id,
      reason: 'Finished goods received for distribution',
    },
  ];

  for (const movement of movements) {
    const existing = await prisma.stockMovement.findFirst({
      where: {
        reference: movement.reference,
      },
    });

    if (!existing) {
      await prisma.stockMovement.create({
        data: movement,
      });
    }
  }

  // ============================================================
  // STOCK LEVELS
  // ============================================================

  const stockLevels = [
    {
      productId: steelSheet.id,
      warehouseId: principal.id,
      quantity: 140,
    },
    {
      productId: industrialMotor.id,
      warehouseId: principal.id,
      quantity: 8,
    },
    {
      productId: cardboardBox.id,
      warehouseId: principal.id,
      quantity: 150,
    },
    {
      productId: hydraulicOil.id,
      warehouseId: principal.id,
      quantity: 35,
    },
    {
      productId: safetyGloves.id,
      warehouseId: principal.id,
      quantity: 18,
    },
    {
      productId: steelSheet.id,
      warehouseId: production.id,
      quantity: 40,
    },
    {
      productId: industrialMotor.id,
      warehouseId: distribution.id,
      quantity: 8,
    },
  ];

  for (const stock of stockLevels) {
    await prisma.stockLevel.upsert({
      where: {
        productId_warehouseId: {
          productId: stock.productId,
          warehouseId: stock.warehouseId,
        },
      },
      update: {
        quantity: stock.quantity,
      },
      create: stock,
    });
  }

  // ============================================================
  // INVENTORY COUNT
  // ============================================================

  const existingCount = await prisma.inventoryCount.findFirst({
    where: {
      warehouseId: principal.id,
      status: 'DRAFT',
    },
  });

  if (!existingCount) {
    await prisma.inventoryCount.create({
      data: {
        warehouseId: principal.id,
        status: 'DRAFT',
        lines: {
          create: [
            {
              productId: steelSheet.id,
              systemQty: 140,
              countedQty: 140,
              discrepancy: 0,
            },
            {
              productId: industrialMotor.id,
              systemQty: 8,
              countedQty: 7,
              discrepancy: -1,
              justification: 'One unit damaged during handling',
            },
            {
              productId: cardboardBox.id,
              systemQty: 150,
              countedQty: 150,
              discrepancy: 0,
            },
          ],
        },
      },
    });
  }

  // ============================================================
  // AUDIT LOG
  // ============================================================

  const existingAudit = await prisma.auditLog.findFirst({
    where: {
      action: 'SEED_DATA',
      entity: 'demo',
    },
  });

  if (!existingAudit) {
    await prisma.auditLog.create({
      data: {
        action: 'SEED_DATA',
        entity: 'demo',
        userId: admin.id,
        userEmail: admin.email,
      },
    });
  }

  // ============================================================
  // DONE
  // ============================================================

  console.log('ERP demo seed completed successfully.');
  console.log('');
  console.log('Demo accounts:');
  console.log('Admin:         admin@erp.local / AdminERP2026!');
  console.log('Stock Manager: stock.manager@erp.local / StockManager2026!');
  console.log('Viewer:        viewer@erp.local / ViewerERP2026!');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });