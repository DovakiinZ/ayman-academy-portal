import { Outlet } from 'react-router-dom';
import MobileHeader from './MobileHeader';
import BottomNavigation from './BottomNavigation';

export default function MobileLayout() {
    return (
        <div className="min-h-screen bg-secondary/30 flex flex-col">
            <MobileHeader />

            {/* Main Content — padded for header + bottom nav clearance */}
            <main
                className="flex-1"
                style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
            >
                <div className="px-4 py-6">
                    <Outlet />
                </div>
            </main>

            <BottomNavigation />
        </div>
    );
}
