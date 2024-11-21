import prisma from './prisma'; // Assuming you have a Prisma client setup

export async function fetchOrders() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        status: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        paymentMethod: {
          select: {
            id: true,
            name: true
          }
        },
        deliveryMethod: {
          select: {
            id: true,
            name: true
          }
        },
        currency: {
          select: {
            id: true,
            code: true,
            symbol: true
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}
