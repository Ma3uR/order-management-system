import prisma from './prisma'; // Assuming you have a Prisma client setup

/**
 * Fetches all orders from the database with related information.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of order objects. Each order object includes status, payment method, delivery method, and currency information. Returns an empty array if an error occurs.
 * @throws {Error} Logs the error to console if there's an issue fetching orders.
 */
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
