import { PrismaClient, Role, OrderStatus, PaymentMethod } from '@prisma/client';
import * as argon from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const password = await argon.hash('admin1234');

  await prisma.user.upsert({
    where: { email: 'admin@central.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@central.com',
      password,
      role: Role.ADMIN,
    },
  });

  const groceryCategory = await prisma.productCategory.upsert({
    where: { name: 'Mercearia' },
    update: {},
    create: { name: 'Mercearia' },
  });

  const cleaningCategory = await prisma.productCategory.upsert({
    where: { name: 'Limpeza' },
    update: {},
    create: { name: 'Limpeza' },
  });

  const acmeSupplier = await prisma.supplier.upsert({
    where: { cnpj: '12345678000190' },
    update: {},
    create: {
      name: 'ACME Distribuidora',
      cnpj: '12345678000190',
      phone: '+55 11 99999-0000',
      email: 'contato@acme.com',
    },
  });

  const cleanCoSupplier = await prisma.supplier.upsert({
    where: { cnpj: '11222333000155' },
    update: {},
    create: {
      name: 'Clean Co.',
      cnpj: '11222333000155',
      phone: '+55 11 98888-7777',
      email: 'vendas@cleanco.com',
    },
  });

  const arrozBranco = await prisma.product.upsert({
    where: { sku: 'ARROZ-001' },
    update: {
      name: 'Arroz Branco 5kg',
      price: 26.9,
      cost: 18.5,
      unit: 'UN',
      minStock: 10,
      currentQty: 120,
      isActive: true,
      categoryId: groceryCategory.id,
      supplierId: acmeSupplier.id,
    },
    create: {
      name: 'Arroz Branco 5kg',
      sku: 'ARROZ-001',
      price: 26.9,
      cost: 18.5,
      unit: 'UN',
      minStock: 10,
      currentQty: 120,
      isActive: true,
      categoryId: groceryCategory.id,
      supplierId: acmeSupplier.id,
    },
  });

  const detergente = await prisma.product.upsert({
    where: { sku: 'DETER-500' },
    update: {
      name: 'Detergente Neutro 500ml',
      price: 4.5,
      cost: 2.3,
      unit: 'UN',
      minStock: 20,
      currentQty: 200,
      isActive: true,
      categoryId: cleaningCategory.id,
      supplierId: cleanCoSupplier.id,
    },
    create: {
      name: 'Detergente Neutro 500ml',
      sku: 'DETER-500',
      price: 4.5,
      cost: 2.3,
      unit: 'UN',
      minStock: 20,
      currentQty: 200,
      isActive: true,
      categoryId: cleaningCategory.id,
      supplierId: cleanCoSupplier.id,
    },
  });

  const initialLoadCount = await prisma.stockMovement.count({
    where: { reason: 'INITIAL_LOAD' },
  });

  if (initialLoadCount === 0) {
    await prisma.stockMovement.createMany({
      data: [
        {
          productId: arrozBranco.id,
          qty: 120,
          reason: 'INITIAL_LOAD',
        },
        {
          productId: detergente.id,
          qty: 200,
          reason: 'INITIAL_LOAD',
        },
      ],
    });
  }

  const mariaCustomer = await prisma.customer.upsert({
    where: { document: '12345678901' },
    update: {},
    create: {
      name: 'Maria Silva',
      document: '12345678901',
      phone: '+55 11 97777-6666',
      email: 'maria.silva@email.com',
      address: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      zipcode: '01001-000',
    },
  });

  const joaoCustomer = await prisma.customer.upsert({
    where: { document: '98765432100' },
    update: {},
    create: {
      name: 'João Pereira',
      document: '98765432100',
      phone: '+55 11 96666-5555',
      email: 'joao.pereira@email.com',
      address: 'Av. Paulista, 1000',
      city: 'São Paulo',
      state: 'SP',
      zipcode: '01310-100',
    },
  });

  const existingOrder = await prisma.order.findUnique({ where: { number: 1 } });

  if (!existingOrder) {
    const order = await prisma.order.create({
      data: {
        number: 1,
        customerId: mariaCustomer.id,
        status: OrderStatus.OPEN,
        paymentMethod: PaymentMethod.PIX,
        dueDate: new Date(),
        total: 58.3,
        items: {
          create: [
            {
              productId: arrozBranco.id,
              qty: 2,
              price: 26.9,
              total: 53.8,
            },
            {
              productId: detergente.id,
              qty: 1,
              price: 4.5,
              total: 4.5,
            },
          ],
        },
      },
    });

    await prisma.product.update({
      where: { id: arrozBranco.id },
      data: { currentQty: { decrement: 2 } },
    });

    await prisma.product.update({
      where: { id: detergente.id },
      data: { currentQty: { decrement: 1 } },
    });

    await prisma.stockMovement.createMany({
      data: [
        {
          productId: arrozBranco.id,
          qty: -2,
          reason: 'ORDER_FULFILLED',
          referenceId: order.id,
        },
        {
          productId: detergente.id,
          qty: -1,
          reason: 'ORDER_FULFILLED',
          referenceId: order.id,
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
