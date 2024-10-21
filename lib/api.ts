import prisma from './prisma'; // Assuming you have a Prisma client setup

export async function fetchOrders() {
  try {
    const orders = await prisma.order.findMany();
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}
