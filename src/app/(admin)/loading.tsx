export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gin-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gin-text-light">Loading...</p>
      </div>
    </div>
  );
}
