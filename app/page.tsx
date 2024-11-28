"use client"

import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8 text-center">Welcome to SMM System</h1>
      <div className="flex flex-col items-center space-y-4">
        <Link href="/dashboard">
          <Button size="lg">Go to Dashboard</Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline" size="lg">Projects</Button>
        </Link>
        <Link href="/login">
          <Button variant="ghost" size="lg">Login</Button>
        </Link>
        <Link href="/register">
          <Button variant="link" size="lg">Register</Button>
        </Link>
      </div>
    </div>
  )
}
