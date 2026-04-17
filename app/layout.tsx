import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Matcher",
  description: "Match your resume to job descriptions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
