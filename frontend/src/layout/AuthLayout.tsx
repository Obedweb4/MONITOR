import PublicLayout from "./PublicLayout";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
}

export default function AuthLayout({ children, title, subtitle, icon, iconBg = "bg-emerald-500" }: AuthLayoutProps) {
  return (
    <PublicLayout>
      <div className="flex-1 flex items-center justify-center py-10 px-4 min-h-[70vh]">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            {icon && (
              <div className={`w-14 h-14 ${iconBg} rounded-2xl center text-white mx-auto mb-4 shadow-sm`}>
                {icon}
              </div>
            )}
            <h1 className="text-2xl font-bold font-outfit">{title}</h1>
            {subtitle && <p className="text-muted text-sm mt-1 max-w-xs mx-auto">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </PublicLayout>
  );
}
