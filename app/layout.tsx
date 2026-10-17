import "./globals.css";
import type { ReactNode } from "react";
import { LangProvider } from "@/lib/i18n";

export const metadata = {
  title: "Fan Table Seoul",
  description: "Eat where your idol ate. Book in your language, no Korean account needed.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body><LangProvider>{children}</LangProvider></body>
    </html>
  );
}
