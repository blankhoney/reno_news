import type { ReactNode } from "react";
import "./styles.css";

export const metadata = {
  title: "Reno News",
  description: "Chinese-first public intelligence reading system"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
