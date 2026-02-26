import React from 'react';
import {
    LayoutDashboard,
    PackagePlus,
    Package,
    Menu,
    X,
    LogOut,
    Smartphone,
    Settings
} from 'lucide-react';
import { ViewState } from '../types';
import { SidebarItem } from './SidebarItem';

interface AdminLayoutProps {
    children: React.ReactNode;
    session: any;
    viewState: ViewState;
    setViewState: (state: ViewState) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    handleSignOut: () => void;
    goToPublic: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
    children,
    session,
    viewState,
    setViewState,
    isSidebarOpen,
    setIsSidebarOpen,
    handleSignOut,
    goToPublic,
}) => {
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
          flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="h-16 flex items-center px-6 border-b border-slate-100">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-primary-500/30">
                        <LayoutDashboard className="text-white w-5 h-5" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                        LuxeAdmin
                    </span>
                    <button onClick={toggleSidebar} className="ml-auto lg:hidden text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Inventory</div>

                    <SidebarItem
                        icon={<Package size={20} />}
                        label="Product List"
                        isActive={viewState.type === 'list'}
                        onClick={() => {
                            setViewState({ type: 'list' });
                            setIsSidebarOpen(false);
                        }}
                    />
                    <SidebarItem
                        icon={<PackagePlus size={20} />}
                        label="Add Product"
                        isActive={viewState.type === 'create'}
                        onClick={() => {
                            setViewState({ type: 'create' });
                            setIsSidebarOpen(false);
                        }}
                    />

                    <div className="mt-8 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">System</div>
                    <SidebarItem
                        icon={<Settings size={20} />}
                        label="Settings"
                        isActive={viewState.type === 'settings'}
                        onClick={() => {
                            setViewState({ type: 'settings' });
                            setIsSidebarOpen(false);
                        }}
                    />

                    <div className="mt-8 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Preview</div>
                    <SidebarItem
                        icon={<Smartphone size={20} />}
                        label="Live Frontend"
                        isActive={false}
                        onClick={() => {
                            goToPublic();
                            setIsSidebarOpen(false);
                        }}
                    />
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="px-4 py-2 mb-2 text-xs text-slate-400 truncate">
                        Logged in as: <br /> <span className="text-slate-600 font-medium">Admin</span>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                        <LogOut size={18} className="mr-3 text-slate-400 group-hover:text-red-500 transition-colors" />
                        <span className="group-hover:text-slate-900">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header (Mobile) */}
                <header className="h-16 lg:hidden bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0">
                    <button onClick={toggleSidebar} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                        <Menu size={24} />
                    </button>
                    <span className="font-semibold text-slate-800">
                        {viewState.type === 'create' ? 'New Product' : viewState.type === 'edit' ? 'Edit Product' : viewState.type === 'settings' ? 'Settings' : 'Inventory'}
                    </span>
                    <div className="w-8" /> {/* Spacer */}
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <div className="max-w-5xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
