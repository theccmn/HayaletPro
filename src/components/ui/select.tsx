import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "../../lib/utils"

interface SelectContextValue {
    value: string
    onValueChange: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

interface SelectProps {
    value?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
}

const Select = ({ value = "", onValueChange, children }: SelectProps) => {
    const [open, setOpen] = React.useState(false)

    return (
        <SelectContext.Provider value={{ value, onValueChange: onValueChange || (() => { }), open, setOpen }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children?: React.ReactNode
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
    ({ className, children, ...props }, ref) => {
        const context = React.useContext(SelectContext)
        if (!context) throw new Error("SelectTrigger must be used within Select")

        return (
            <button
                ref={ref}
                type="button"
                onClick={() => context.setOpen(!context.open)}
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
                    className
                )}
                {...props}
            >
                {children}
                <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
        )
    }
)
SelectTrigger.displayName = "SelectTrigger"

interface SelectValueProps {
    placeholder?: string
}

const SelectValue = ({ placeholder }: SelectValueProps) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectValue must be used within Select")

    return (
        <span className={cn(!context.value && "text-muted-foreground")}>
            {context.value || placeholder}
        </span>
    )
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
    ({ className, children, ...props }, _ref) => {
        const context = React.useContext(SelectContext)
        if (!context) throw new Error("SelectContent must be used within Select")

        const contentRef = React.useRef<HTMLDivElement>(null)

        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
                    context.setOpen(false)
                }
            }

            if (context.open) {
                document.addEventListener("mousedown", handleClickOutside)
            }

            return () => document.removeEventListener("mousedown", handleClickOutside)
        }, [context.open, context])

        if (!context.open) return null

        return (
            <div
                ref={contentRef}
                className={cn(
                    "absolute z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 top-full mt-1 w-full",
                    className
                )}
                {...props}
            >
                <div className="max-h-[200px] overflow-auto">{children}</div>
            </div>
        )
    }
)
SelectContent.displayName = "SelectContent"

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string
    children?: React.ReactNode
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
    ({ className, value, children, ...props }, ref) => {
        const context = React.useContext(SelectContext)
        if (!context) throw new Error("SelectItem must be used within Select")

        const isSelected = context.value === value

        return (
            <div
                ref={ref}
                onClick={() => {
                    context.onValueChange(value)
                    context.setOpen(false)
                }}
                className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    isSelected && "bg-accent",
                    className
                )}
                {...props}
            >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {isSelected && <Check className="h-4 w-4" />}
                </span>
                {children}
            </div>
        )
    }
)
SelectItem.displayName = "SelectItem"

export {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
}
