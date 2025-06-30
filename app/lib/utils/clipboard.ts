/**
 * Utility function to copy text to clipboard with fallback support
 * Works in both secure (HTTPS) and insecure (HTTP) contexts
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  // Fallback function for when clipboard API is not available
  const fallbackCopy = (text: string): Promise<boolean> => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      return Promise.resolve(successful)
    } catch (err) {
      document.body.removeChild(textArea)
      return Promise.reject(err)
    }
  }

  try {
    // Use modern clipboard API if available, otherwise fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      return await fallbackCopy(text)
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    throw error
  }
}