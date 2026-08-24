"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const navLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#roles", label: "Roles" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // const session = await getServerSession(authOptions)
  // console.log(session)
  // const role = session.user;
  // const user = ""
  const isLanding = pathname === "/";

  return (
//     <header
//       // className={cn(
//       //   "sticky top-0 z-50 w-full transition-all duration-300",
//       //   isLanding
//       //     ? "border-b border-white/10 bg-white backdrop-blur-xl"
//       //     : "border-b border-border bg-background/0 backdrop-blur-xl",
//       // )}
//       className={cn(
//     "sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-300",
//     isLanding
//       ? "border-border/70 bg-background/90"
//       : "border-border bg-background/90",
//   )}
//     >
//       <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
//         <Link href="/" className="group flex items-center gap-2.5">
//           <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/25 transition-transform group-hover:scale-105">
//             <Zap className="h-5 w-5" fill="currentColor" />
//           </div>

//           {/* <div className="flex flex-col leading-none">
//             <span className="font-poppins text-lg font-bold tracking-tight text-slate-950">
//               Servi<span className="text-[#CC1943]">z</span>ato
//             </span>

//             <span className="mt-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-800">
//               Services Made Simple
//             </span>
//           </div> */}
//           <div className="flex flex-col leading-none">
//   <span className="font-poppins text-lg font-bold tracking-tight text-foreground">
//     Servi
//     <span className="text-brand-coral">
//       z
//     </span>
//     ato
//   </span>

//   <span className="mt-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
//     Services Made Simple
//   </span>
// </div>
//         </Link>

//         <nav className="hidden items-center gap-1 md:flex">
//           {navLinks.map((link) => (
//             <Link
//               key={link.href}
//               href={link.href}
//               className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-brand-coral hover:text-accent-foreground"
//             >
//               {link.label}
//             </Link>
//           ))}
//         </nav>

//         <div className="hidden items-center gap-2 md:flex">
//           <Link href="/signin">
//             <Button
//               variant="outline"
//               size="sm"
//               className="text-foreground text-md font-bold hover:bg-[#CC1943]"
//             >
//               Sign in
//             </Button>
//           </Link>
//           <Link href="/signup">
//             <Button
//               size="sm"
//               className="bg-linear-to-r from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/25 hover:shadow-brand-coral/40"
//             >
//               Get started
//             </Button>
//           </Link>
//         </div>

//         <button
//           className="flex items-center justify-center rounded-lg p-2 text-accent md:hidden"
//           onClick={() => setMobileOpen(!mobileOpen)}
//           aria-label="Toggle menu"
//         >
//           {mobileOpen ? (
//             <X className="h-5 w-5" />
//           ) : (
//             <Menu className="h-5 w-5" />
//           )}
//         </button>
//       </div>

//       <AnimatePresence>
//         {mobileOpen && (
//           <motion.div
//             initial={{ height: 0, opacity: 0 }}
//             animate={{ height: "auto", opacity: 1 }}
//             exit={{ height: 0, opacity: 0 }}
//             transition={{ duration: 0.2 }}
//             className="overflow-hidden border-t border-border bg-background/85 backdrop-blur-xl md:hidden"
//           >
//             <div className="space-y-1 px-4 py-4">
//               {navLinks.map((link) => (
//                 <Link
//                   key={link.href}
//                   href={link.href}
//                   onClick={() => setMobileOpen(false)}
//                   className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground  transition-colors hover:bg-accent hover:text-accent-foreground"
//                 >
//                   {link.label}
//                 </Link>
//               ))}
//               <div className="flex flex-col gap-2 pt-3">
//                 <Link href="/signin" onClick={() => setMobileOpen(false)}>
//                   <Button className="text-white bg-brand-teal w-full  text-md font-bold hover:bg-brand-coral">
//                     Sign in
//                   </Button>
//                 </Link>
//                 <Link href="/signup" onClick={() => setMobileOpen(false)}>
//                   <Button className="w-full bg-linear-to-r from-brand-coral to-brand-coral-dark text-white">
//                     Get started
//                   </Button>
//                 </Link>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </header>

<header
      className={cn(
        "sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-300",
        isLanding
          ? "border-border/70 bg-background/90"
          : "border-border bg-background/90",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/25 transition-transform group-hover:scale-105">
            <Zap
              className="h-5 w-5"
              fill="currentColor"
            />
          </div>

          <div className="flex flex-col leading-none">
            <span className="font-poppins text-lg font-bold tracking-tight text-foreground">
              Servi
              <span className="text-brand-coral">
                z
              </span>
              ato
            </span>

            <span className="mt-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Services Made Simple
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map(
            (link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">

          <Link href="/signin">
            <Button
              variant="outline"
              size="sm"
              className="text-md font-bold text-foreground hover:bg-brand-coral hover:text-white"
            >
              Sign in
            </Button>
          </Link>

          <Link href="/signup">
            <Button
              size="sm"
              className="bg-linear-to-r from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/25 hover:shadow-brand-coral/40"
            >
              Get started
            </Button>
          </Link>

        </div>

        {/* Mobile */}
        <button
          className="flex items-center justify-center rounded-lg p-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
          onClick={() =>
            setMobileOpen(
              !mobileOpen,
            )
          }
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
            }}
            className="overflow-hidden border-t border-border bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1 px-4 py-4">

              {navLinks.map(
                (link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() =>
                      setMobileOpen(false)
                    }
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {link.label}
                  </Link>
                ),
              )}

              <div className="flex flex-col gap-2 pt-3">

                <Link
                  href="/signin"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  <Button className="w-full bg-brand-teal text-md font-bold text-white hover:bg-brand-teal-dark">
                    Sign in
                  </Button>
                </Link>

                <Link
                  href="/signup"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  <Button className="w-full bg-brand-coral text-white hover:bg-brand-coral-dark">
                    Get started
                  </Button>
                </Link>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
