import "./globals.css";

export const metadata = {
  title: "MITS Attendance Tracker | Madanapalle Institute of Technology & Science",
  description: "Official real-time attendance tracker and bunk optimizer for MITS GEMS students.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2563eb',
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
