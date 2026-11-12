import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        over: "bg-red-100 text-red-800",
        near: "bg-amber-100 text-amber-900",
        ok: "bg-emerald-100 text-emerald-800",
        info: "bg-slate-100 text-slate-700",
        overlap: "bg-indigo-100 text-indigo-800",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
