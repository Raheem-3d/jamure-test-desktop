"use client"
import { usePermissions } from "@/hooks/usePermissions"
import { Button, type ButtonProps } from "@/components/ui/button"
import type { Permission } from "@/lib/permissions"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ProtectedButtonProps extends ButtonProps {
  permission: Permission
  fallbackMessage?: string
  hideIfNoAccess?: boolean
}

/**
 * Button component that enforces permission checks
 * - Shows disabled button with tooltip if user lacks permission
 * - Optionally hides button completely if hideIfNoAccess is true
 */
export function ProtectedButton({
  permission,
  fallbackMessage = "You don't have permission to perform this action",
  hideIfNoAccess = false,
  children,
  ...props
}: ProtectedButtonProps) {
  const { can } = usePermissions()
  const hasAccess = can(permission)
  
  // Hide button completely if user doesn't have access and hideIfNoAccess is true
  if (!hasAccess && hideIfNoAccess) {
    return null
  }
  
  // Show disabled button with tooltip if user doesn't have access
  if (!hasAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button {...props} disabled className="pointer-events-auto">
                {children}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{fallbackMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  // User has access, show normal button
  return <Button {...props}>{children}</Button>
}
