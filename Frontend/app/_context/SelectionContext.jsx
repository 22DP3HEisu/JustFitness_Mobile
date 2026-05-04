import React, { createContext, useContext, useRef, useCallback } from 'react'

const SelectionContext = createContext(null)

/**
 * Simple selection context - only stores the callback function.
 * Config is passed via route params to avoid timing issues.
 */
export const SelectionProvider = ({ children }) => {
  // Store callbacks in a stack so nested selection flows do not overwrite their parent.
  const callbackStackRef = useRef([])
  
  /**
   * Set the selection callback before navigating
   * @param {Function} callback - Function to call with selected items
   */
  const setSelectionCallback = useCallback((callback) => {
    callbackStackRef.current = [...callbackStackRef.current, callback]
  }, [])
  
  /**
   * Fire the callback with selected items and clear it
   * @param {Array} selectedItems - Array of selected item objects
   */
  const confirmSelection = useCallback((selectedItems) => {
    const callback = callbackStackRef.current[callbackStackRef.current.length - 1]
    callbackStackRef.current = callbackStackRef.current.slice(0, -1)

    if (callback) {
      callback(selectedItems)
    }
  }, [])
  
  /**
   * Clear callback without firing (user cancelled)
   */
  const cancelSelection = useCallback(() => {
    callbackStackRef.current = callbackStackRef.current.slice(0, -1)
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
