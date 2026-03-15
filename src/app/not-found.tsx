import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-4">The page you are looking for could not be found.</p>
        <Link href="/front" className="text-gin-primary hover:underline">
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
