

import type { Metadata } from "next";
//import { Geist, Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Inter, Plus_Jakarta_Sans, Poppins, Manrope } from "next/font/google";
// import { Poppins } from "next/font/google";
// import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import Provider from "./Provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "@/components/providers/Theme-Provider";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Servizato",
  description: "Explore the Servizato marketplace through customer, service provider, and technician accounts",
   icons: {
    icon: "/servizato.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // const queryClient = new QueryClient();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={` ${manrope.variable} ${poppins.variable} ${inter.variable} ${jakarta.variable}  antialiased`}>
        <ThemeProvider>
          <Provider>
            <Toaster />
            {children}
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
