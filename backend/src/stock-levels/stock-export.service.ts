import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class StockExportService {
  constructor(private prisma: PrismaService) {}

  async exportCurrentStock() {
    const stock = await this.prisma.stockLevel.findMany({
      include: {
        product: true,
        warehouse: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Current Stock');

    worksheet.columns = [
      { header: 'Product', key: 'product', width: 30 },
      { header: 'Warehouse', key: 'warehouse', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Minimum Stock', key: 'minStock', width: 20 },
    ];

    stock.forEach((item) => {
      worksheet.addRow({
        product: item.product.name,
        warehouse: item.warehouse.name,
        quantity: item.quantity,
        minStock: item.product.minStock,
      });
    });

    return workbook.xlsx.writeBuffer();
  }
}