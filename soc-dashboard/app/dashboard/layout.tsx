export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-black min-h-screen text-green-500 font-mono">
            {children}
        </div>
    );
}
