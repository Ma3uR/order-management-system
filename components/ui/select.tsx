"use client"

import React from "react"

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
  )
}

export const SelectContent = Select
export const SelectItem = 'option' as any
export const SelectTrigger = Select
export const SelectValue = React.Fragment
