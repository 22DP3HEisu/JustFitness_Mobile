import React, { createContext, useContext, useRef, useCallback } from 'react'

const SelectionContext = createContext(null)

/**
 * Simple selection context - only stores the callback function.
 * Config is passed via route params to avoid timing issues.
 */
export const SelectionProvider = ({ children }) => {
  // Store callback in ref - survives navigation and avoids re-renders
  const callbackRef = useRef(null)
  
  /**
   * Set the selection callback before navigating
   * @param {Function} callback - Function to call with selected items
   */
  const setSelectionCallback = useCallback((callback) => {
    callbackRef.current = callback
  }, [])
  
  /**
   * Fire the callback with selected items and clear it
   * @param {Array} selectedItems - Array of selected item objects
   */
  const confirmSelection = useCallback((selectedItems) => {
    if (callbackRef.current) {
      callbackRef.current(selectedItems)
      callbackRef.current = null
    }
  }, [])
  
  /**
   * Clear callback without firing (user cancelled)
   */
  const cancelSelection = useCallback(() => {
    callbackRef.current = null
  }, [])
  
  return (
    <SelectionContext.Provider value={{
      setSelectionCallback,
      confirmSelection,
      cancelSelection,
    }}>
      {children}
    </SelectionContext.Provider>
  )
}

export const useSelection = () => {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider')
  }
  return context
}
