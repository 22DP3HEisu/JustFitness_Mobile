import React, { createContext, useContext, useRef, useCallback } from 'react'

const SelectionContext = createContext(null)

/**
 * Izvēles konteksts glabā tikai atzvanes funkciju.
 * Konfigurācija tiek padota ar maršruta parametriem, lai izvairītos no laika secības problēmām.
 */
export const SelectionProvider = ({ children }) => {
  // Atzvanes funkcijas tiek glabātas stekā, lai ligzdotas izvēles nepārrakstītu iepriekšējo izvēli.
  const callbackStackRef = useRef([])
  
  /**
   * Pirms navigācijas tiek iestatīta izvēles atzvanes funkcija.
   * @param {Function} callback - funkcija, kas tiek izsaukta ar izvēlētajiem ierakstiem.
   */
  const setSelectionCallback = useCallback((callback) => {
    callbackStackRef.current = [...callbackStackRef.current, callback]
  }, [])
  
  /**
   * Tiek izsaukta atzvanes funkcija ar izvēlētajiem ierakstiem un pēc tam notīrīta.
   * @param {Array} selectedItems - izvēlēto ierakstu objektu masīvs.
   */
  const confirmSelection = useCallback((selectedItems) => {
    const callback = callbackStackRef.current[callbackStackRef.current.length - 1]
    callbackStackRef.current = callbackStackRef.current.slice(0, -1)

    if (callback) {
      callback(selectedItems)
    }
  }, [])
  
  /**
   * Atzvanes funkcija tiek notīrīta bez izsaukšanas, ja lietotājs atceļ darbību.
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
