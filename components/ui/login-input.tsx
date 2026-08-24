import * as React from "react";

import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function LoginInput({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="login-input"
      className={cn(
        `
        h-11
        w-full
        min-w-0
        rounded-xl
        border
        border-slate-200
        bg-white
        px-3
        py-2
        text-sm
        text-slate-900
        shadow-sm
        outline-none
        transition-all

        placeholder:text-slate-400

        hover:border-slate-300

        focus-visible:border-brand-coral
        focus-visible:ring-3
        focus-visible:ring-brand-coral/15

        disabled:pointer-events-none
        disabled:cursor-not-allowed
        disabled:bg-slate-50
        disabled:opacity-60

        aria-invalid:border-destructive
        aria-invalid:ring-3
        aria-invalid:ring-destructive/15

        file:inline-flex
        file:h-7
        file:border-0
        file:bg-transparent
        file:text-sm
        file:font-medium

        md:text-sm
        `,
        className
      )}
      {...props}
    />
  );
}

export { LoginInput };