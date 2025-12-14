import "./globals.css";

export const metadata = {
  title: "Shifted Dating",
  description: "Meet people on your schedule — no spam, no stress."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
