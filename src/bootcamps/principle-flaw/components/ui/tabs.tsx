import * as React from "react"
import { cn } from "@/lib/utils"

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full", className)}
    {...props}
  />
))
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-zinc-100 p-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  const isActive = context?.value === value

  return (
    <button
      ref={ref}
      onClick={() => context?.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300 dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:text-zinc-50",
        isActive && "bg-white text-zinc-950 shadow-sm dark:bg-zinc-950 dark:text-zinc-50",
        className
      )}
      data-state={isActive ? "active" : "inactive"}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  if (context?.value !== value) return null

  return (
    <div
      ref={ref}
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
} | null>(null)

const TabsRoot = ({ 
  defaultValue, 
  value: controlledValue, 
  onValueChange: controlledOnValueChange, 
  className, 
  children 
}: { 
  defaultValue?: string, 
  value?: string, 
  onValueChange?: (value: string) => void, 
  className?: string, 
  children: React.ReactNode 
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const value = controlledValue !== undefined ? controlledValue : internalValue
  const onValueChange = controlledOnValueChange !== undefined ? controlledOnValueChange : setInternalValue

  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export { TabsRoot as Tabs, TabsList, TabsTrigger, TabsContent }
