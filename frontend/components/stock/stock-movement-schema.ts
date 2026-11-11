import { z } from "zod";


export const stockMovementSchema =
z.discriminatedUnion("type",[

z.object({
 type:z.literal("IN"),
 productId:z.number(),
 warehouseId:z.number(),
 quantity:z.number().positive(),
 reference:z.string().optional(),
}),


z.object({
 type:z.literal("OUT"),
 productId:z.number(),
 warehouseId:z.number(),
 quantity:z.number().positive(),
 reference:z.string().optional(),
}),


z.object({
 type:z.literal("TRANSFER"),
 productId:z.number(),
 fromWarehouseId:z.number(),
 toWarehouseId:z.number(),
 quantity:z.number().positive(),
 reference:z.string().optional(),
}),


z.object({
 type:z.literal("CORRECTION"),
 productId:z.number(),
 warehouseId:z.number(),
 quantity:z.number(),
 reason:z.string().min(3),
})

]);