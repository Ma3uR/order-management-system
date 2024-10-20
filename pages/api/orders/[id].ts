import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: Number(id) },
        data: req.body,
      });
      res.status(200).json(updatedOrder);
    } catch (error) {
      res.status(400).json({ error: 'Error updating order', details: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.order.delete({
        where: { id: Number(id) },
      });
      res.status(204).end();
    } catch (error) {
      res.status(400).json({ error: 'Error deleting order', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
