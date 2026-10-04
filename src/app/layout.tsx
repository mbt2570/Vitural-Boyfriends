import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "纸片人男友",
  description: "虚拟男友聊天应用",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
