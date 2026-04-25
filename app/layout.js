import "./globals.css";

export const metadata = {
  title: "Parking App",
  description: "Aplicatie rezervare locuri parcare",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}