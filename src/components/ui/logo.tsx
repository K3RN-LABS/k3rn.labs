import { cn } from "@/lib/utils"
import Link from "next/link";

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const SIZES = {
  sm: 28,
  md: 36,
  lg: 56,
}

export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center group cursor-pointer", className)}>
      <img
        src="/logo-icon/logo.svg"
        alt="k3rn.labs"
        width={SIZES[size]}
        height={SIZES[size]}
        className="shrink-0 transition-transform duration-500 ease-in-out group-hover:rotate-180"
      />
    </Link>
  )
}
