"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const CollapsibleContext = React.createContext({})

const Collapsible = React.forwardRef(
  ({ open, onOpenChange, defaultOpen = false, children, className, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)

    const openState = open !== undefined ? open : isOpen

    const handleToggle = React.useCallback(() => {
      if (onOpenChange) {
        onOpenChange(!openState)
      } else {
        setIsOpen(!openState)
      }
    }, [openState, onOpenChange])

    const contextValue = React.useMemo(
      () => ({
        open: openState,
        onToggle: handleToggle,
      }),
      [openState, handleToggle],
    )

    return (
      <CollapsibleContext.Provider value={contextValue}>
        <div ref={ref} className={cn("", className)} {...props}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  },
)
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = React.forwardRef(({ children, className, asChild = false, onClick, ...props }, ref) => {
  const { onToggle } = React.useContext(CollapsibleContext)

  const handleClick = (e) => {
    onToggle()
    onClick?.(e)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onClick: handleClick,
      ref,
    })
  }

  return (
    <button ref={ref} className={cn("", className)} onClick={handleClick} {...props}>
      {children}
    </button>
  )
})
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef(({ children, className, ...props }, ref) => {
  const { open } = React.useContext(CollapsibleContext)
  const contentRef = React.useRef(null)
  const [height, setHeight] = React.useState(0)

  React.useEffect(() => {
    if (contentRef.current) {
      setHeight(open ? contentRef.current.scrollHeight : 0)
    }
  }, [open])

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden transition-all duration-200 ease-in-out", className)}
      style={{ height: `${height}px` }}
      {...props}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
