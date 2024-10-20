"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/smm-system/components/ui/button"
import { Input } from "@/smm-system/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/smm-system/components/ui/card"
import axios from 'axios'

export default function Register() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await axios.post('/api/users', {
        name,
        email,
        password
      })

      if (response.status === 201) {
        console.log('User created successfully:', response.data)
        router.push('/login')
      } else {
        setError(`Failed to create user. Status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error creating user:', error)
      setError(`An error occurred while creating the user: ${error.response?.data?.error || error.message}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Register</h1>
      <Card>
        <CardHeader>
          <CardTitle>User Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <Button type="submit">Register</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
