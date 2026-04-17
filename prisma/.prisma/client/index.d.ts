export class PrismaClient {
  user: any;
  product: any;
  sale: any;
  saleItem: any;
  settings: any;
  stockMovement: any;
  $transaction: any;
}

export enum Role {
  OWNER = "OWNER",
  CASHIER = "CASHIER",
}
