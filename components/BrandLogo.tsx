import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/servizato-logo.webp" alt="Servizato — All your services, one place"
      width={655} height={196} priority={priority}
      className={cn("h-auto w-44 rounded-md bg-white", className)}
    />
  );
}
