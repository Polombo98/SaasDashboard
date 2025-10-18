import Providers from './providers';
import Bootstrapper from './_bootstrap';

export const metadata = { title: 'SaaS Dashboard', description: 'Subscription analytics' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
  <Providers>
    <Bootstrapper />
    {children}
  </Providers>
</body>
      </html>
  );
}