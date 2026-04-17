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
