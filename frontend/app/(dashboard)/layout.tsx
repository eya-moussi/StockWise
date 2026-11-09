
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-[#f3f4fb]">

      {/* Navigation latérale */}
      <Sidebar />

      {/* Contenu principal */}
      <div className="flex min-w-0 flex-1 flex-col">

        <Header />

        <main className="flex-1 p-8">
          {children}
        </main>

      </div>
    </div>
  );
}
