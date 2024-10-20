import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const contentPlans = await prisma.contentPlan.findMany()
      res.status(200).json(contentPlans)
    } catch (error) {
      res.status(500).json({ error: 'Error fetching content plans' })
    }
  } else if (req.method === 'POST') {
    try {
      const { week, year, content, projectId } = req.body
      const contentPlan = await prisma.contentPlan.create({
        data: { week, year, content, projectId },
      })
      res.status(201).json(contentPlan)
    } catch (error) {
      res.status(500).json({ error: 'Error creating content plan' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
