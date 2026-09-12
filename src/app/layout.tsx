import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Apna Crop',
  description: 'Apna Crop — Smart Procurement Portal for automated MSP calculation, digital tokens, and APMC mandi queue management.',
  openGraph: {
    title: 'Apna Crop — Smart Agriculture Procurement Portal',
    description: 'Guaranteed MSP prices, instant token passes, and direct benefit transfer for farmers.',
  },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌾</text></svg>'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
