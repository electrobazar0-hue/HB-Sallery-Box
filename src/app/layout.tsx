import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://hb-sallery-box.vercel.app"),
  title: "HB Sallery Box - Smart Staff Management System",
  description: "Mobile-first staff management application with phone authentication, attendance tracking, GPS, biometric, and salary management.",
  keywords: ["HB Sallery Box", "Staff Management", "Attendance", "Salary", "HR", "Employee", "Biometric", "GPS"],
  authors: [{ name: "HB Sallery Box Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HB Sallery Box",
    startupImage: [
      { url: "/icons/icon-512x512.png", media: "(device-width: 320px)" }
    ]
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true
  },
  openGraph: {
    type: "website",
    siteName: "HB Sallery Box",
    title: "HB Sallery Box - Smart Staff Management",
    description: "Complete staff management with attendance, salary, leave, and incentives",
    images: [{ url: "/icons/icon-512x512.png", width: 512, height: 512 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "HB Sallery Box",
    description: "Smart Staff Management System"
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "HB Sallery",
    "application-name": "HB Sallery Box",
    "msapplication-TileColor": "#10b981",
    "msapplication-tap-highlight": "no",
    "theme-color": "#10b981"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f23" }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />
        
        {/* iOS Splash Screens */}
        <meta name="apple-touch-fullscreen" content="yes" />
        
        {/* Android Chrome */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('SW registered: ', registration.scope);
                    },
                    function(error) {
                      console.log('SW registration failed: ', error);
                    }
                  );
                });
              }
            `
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
