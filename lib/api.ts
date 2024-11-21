import prisma from './prisma'; // Assuming you have a Prisma client setup

export async function fetchOrders() {
  const orders = await prisma.order.findMany({
    include: {
      status: true,
      paymentMethod: true,
      deliveryMethod: true,
      currency: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return orders;
}
