export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gin-bg-app via-gin-bg-header/40 to-gin-bg-app p-4 relative overflow-hidden">
      {/* Subtle decorative background shapes */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gin-primary/[0.04] rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gin-primary/[0.03] rounded-full translate-x-1/3 translate-y-1/3" />
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
