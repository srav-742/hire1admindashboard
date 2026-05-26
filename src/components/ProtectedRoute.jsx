import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, role }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = () => {
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

    if (role && user.role !== role) {
        console.warn(`[ProtectedRoute] Access restricted: user role is '${user.role}' but '${role}' is required.`);
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
