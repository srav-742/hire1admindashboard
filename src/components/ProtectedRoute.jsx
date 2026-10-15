import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, role }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = () => {
            const searchParams = new URLSearchParams(window.location.search);
            const userParam = searchParams.get('user');
            if (userParam) {
                try {
                    const parsed = JSON.parse(decodeURIComponent(userParam));
                    if (parsed?.uid || parsed?._id) {
                        localStorage.setItem('user', JSON.stringify(parsed));
                        setUser(parsed);
                        setIsLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error("Failed to parse user from URL", e);
                }
            }
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                } catch (e) {
                    console.error("Failed to parse user from localStorage", e);
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#f7f4ee]">
                <Loader2 className="w-8 h-8 text-black animate-spin" />
            </div>
        );
    }

    if (!user || !user.uid) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const ADMIN_EMAILS = ['sravyaadmin@gmail.com', 'sravyadhadi@gmail.com', 'admin@hire1percent.com', 'hemangi@web3today.io'];
    const isAdminByEmail = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim());

    if (role && user.role !== role && !isAdminByEmail) {
        console.warn(`[ProtectedRoute] Access restricted: user role is '${user.role}' but '${role}' is required.`);
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
