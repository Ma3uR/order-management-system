import React from 'react'

/**
 * Renders a styled input element with customizable props.
 * @param {React.InputHTMLAttributes<HTMLInputElement>} props - The props to be spread onto the input element.
 * @returns {JSX.Element} A styled input element with applied props and custom styling.
 */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
  )
}
