import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function MainLayout() {
    return (
        <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr] bg-muted/20">
            {/* Background Pattern */}
            <div className="fixed inset-0 -z-10 h-full w-full bg-white [background:radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

            <Sidebar />
            <div className="flex flex-col relative">
                <Header />
                <main className="flex flex-1 flex-col gap-6 p-6 lg:gap-8 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
