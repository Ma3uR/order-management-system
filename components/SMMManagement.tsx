"use client"

import { useState, useEffect } from "react"
import { Button } from "@/smm-system/components/ui/button"
import { Input } from "@/smm-system/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/smm-system/components/ui/table"
import { Badge } from "@/smm-system/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/smm-system/components/ui/tabs"
import { Facebook, Instagram, Twitter, Linkedin, Edit, Trash2, Send } from "lucide-react"
import NewPostModal from "@/components/NewPostModal"
import axios from 'axios'

interface Post {
  id: string
  content: string
  subject: string
  platform: string
  status: string
  scheduledDate?: string
  engagement: number
  projectId: string
  project: { name: string }
}

/**
 * Social Media Management component for managing posts across various platforms.
 * This component handles the display, filtering, editing, deleting, and publishing of posts.
 * It also provides a search functionality and a tab for analytics.
 * @returns {JSX.Element} A React component that renders the Social Media Management interface
 */
export default function SMMManagement() {
  const [posts, setPosts] = useState<Post[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    const response = await axios.get('/api/posts')
    setPosts(response.data)
  }

  const filteredPosts = posts.filter(
    (post) =>
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEditPost = async (post: Post) => {
    // This is a simple implementation. You might want to open a modal for editing instead.
    const newContent = prompt("Edit post content:", post.content)
    if (newContent) {
      try {
        await axios.put(`/api/posts/${post.id}`, { ...post, content: newContent })
        fetchPosts() // Refresh the posts
      } catch (error) {
        console.error('Error updating post:', error)
      }
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await axios.delete(`/api/posts/${postId}`)
        fetchPosts() // Refresh the posts
      } catch (error) {
        console.error('Error deleting post:', error)
      }
    }
  }

  const handlePublishPost = async (post: Post) => {
    try {
      await axios.put(`/api/posts/${post.id}`, { ...post, status: 'published' })
      fetchPosts() // Refresh the posts
    } catch (error) {
      console.error('Error publishing post:', error)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "facebook":
        return <Facebook className="h-4 w-4" />
      case "instagram":
        return <Instagram className="h-4 w-4" />
      case "twitter":
        return <Twitter className="h-4 w-4" />
      case "linkedin":
        return <Linkedin className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div>
      <Tabs defaultValue="posts">
        <TabsList className="mb-4">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <div className="flex justify-between items-center mb-5">
            <Input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <NewPostModal />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.content}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getPlatformIcon(post.platform)}
                      <span className="ml-2 capitalize">{post.platform}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={post.status === "published" ? "success" : post.status === "scheduled" ? "warning" : "secondary"}
                    >
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{post.scheduledDate || "-"}</TableCell>
                  <TableCell>{post.engagement}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditPost(post)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeletePost(post.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {post.status !== "published" && (
                        <Button variant="outline" size="sm" onClick={() => handlePublishPost(post)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Analytics cards here */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
