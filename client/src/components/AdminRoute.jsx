import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/axios';

function AdminRoute({ children }) {
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const response = await api.get('/api/me');

                const user = response.data.user;

                if (user.role === 'admin') {
                    setStatus('admin');
                } else {
                    setStatus('forbidden');
                }
            } catch (error) {
                console.error(
                    'ADMIN ROUTE ERROR:',
                    error
                );

                setStatus('unauthenticated');
            }
        };

        checkAdmin();
    }, []);

    if (status === 'loading') {
        return <p>Loading...</p>;
    }

    if (status === 'unauthenticated') {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    if (status === 'forbidden') {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    return children;
}

export default AdminRoute;