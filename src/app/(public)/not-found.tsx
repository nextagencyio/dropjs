import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-4xl font-bold text-gray-300 mb-4">404</h1>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Page not found</h2>
      <p className="text-gray-500 mb-6">The page you are looking for does not exist or has been moved.</p>
      <Link href="/front" className="text-gin-primary hover:underline">
        &larr; Back to home
      </Link>
    </div>
  );
}
