import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

// Initialize PrismaClient
const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const order = await prisma.order.create({
        data: {
          orderNumber: req.body.orderNumber,
          source: req.body.source,
          deliveryMethod: req.body.deliveryMethod,
          deliveryPostNumber: req.body.deliveryPostNumber,
          phoneNumber: req.body.phoneNumber,
          fullName: req.body.fullName,
          products: req.body.products,
          numberOfItems: req.body.numberOfItems,
          paymentMethod: req.body.paymentMethod,
          amount: req.body.amount,
          status: req.body.status,
        },
      });
      res.status(201).json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(400).json({ error: 'Error creating order', details: error.message });
    }
  } else if (req.method === 'GET') {
    try {
      const orders = await prisma.order.findMany();
      res.status(200).json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: 'Error fetching orders', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Ensure PrismaClient is properly closed
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
