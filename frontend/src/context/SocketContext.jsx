import React, { createContext, useContext, useEffect } from "react";
import socket from "../socket";

const SocketContext = createContext(null);

export function useSocket() {
    return useContext(SocketContext);
}

export function SocketProvider({ children }) {
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token && !socket.connected) {
            socket.auth = { token };
            socket.connect();
        }

        // If the token changes (e.g. login), reconnect
        const handleStorageChange = () => {
            const newToken = localStorage.getItem("token");
            if (newToken && !socket.connected) {
                socket.auth = { token: newToken };
                socket.connect();
            }
            if (!newToken && socket.connected) {
                socket.disconnect();
            }
        };

        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}
