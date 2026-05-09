export const metadata = {
  title: "Dualmark Next.js Example",
  description: "Reference implementation of Dualmark on Next.js 16 App Router.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
