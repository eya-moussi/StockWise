import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from './products/products.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { LocationsModule } from './locations/locations.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { StockLevelsModule } from './stock-levels/stock-levels.module';
import { InventoryCountsModule } from './inventory-counts/inventory-counts.module';
import * as Joi from 'joi';


@Module({
  imports: [
    ConfigModule.forRoot({
  isGlobal: true,

  validationSchema: Joi.object({

    DATABASE_URL: Joi.string().required(),

    JWT_SECRET: Joi.string().required(),

  }),

}),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    ProductCategoriesModule,
    WarehousesModule,
    LocationsModule,
    StockMovementsModule,
    StockLevelsModule,
    InventoryCountsModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}