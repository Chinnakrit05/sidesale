import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "SideSale — Open source POS",
  description: "Simple, self-hostable POS with stock & sales analytics.",
  manifest: "/manifest.json",
  themeColor: "#ff8c00",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <ServiceWorkerRegister />
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
