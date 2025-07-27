import { cn } from "@/lib/utils"

export const Loader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("flex items-center justify-center p-8", className)}
      {...props}
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
