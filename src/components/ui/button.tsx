import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    asChild?: boolean
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, isLoading = false, children, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"

        // Base styles replacing .btn
        const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

        // Variant styles
        const variants = {
            default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow- neon-blue/20 hover:shadow-neon-blue/40",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-neon-green/20 hover:shadow-neon-green/40",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline: "border border-border bg-transparent hover:bg-primary/10 hover:text-primary transition-all duration-300",
            ghost: "hover:bg-white/5 hover:text-primary",
            link: "text-primary underline-offset-4 hover:underline font-bold",
        }

        // Size styles
        const sizes = {
            default: "h-10 px-5 py-2",
            sm: "h-9 rounded-xl px-3",
            lg: "h-12 rounded-2xl px-10 text-base font-bold tracking-tight",
            icon: "h-11 w-11 rounded-2xl",
        }

        return (
            <Comp
                className={cn(baseStyles, "rounded-2xl transition-all duration-300 active:scale-[0.98]", variants[variant], sizes[size], className)}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button }
