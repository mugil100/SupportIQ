/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect } from "react";
import socket from "../socket";

const SocketContext = createContext(null);

export function useSocket() {
    return useContext(SocketContext);
}

export function SocketProvider({ children }) {
    useEffect(() => {
        // Setup local storage interceptors to detect changes in the same tab
        if (!window.__localStorageIntercepted) {
            window.__localStorageIntercepted = true;
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = function(key, _value) {
                originalSetItem.apply(this, arguments);
                if (key === "token") window.dispatchEvent(new Event("local_token_change"));
            };
            const originalRemoveItem = localStorage.removeItem;
            localStorage.removeItem = function(key) {
                originalRemoveItem.apply(this, arguments);
                if (key === "token") window.dispatchEvent(new Event("local_token_change"));
            };
            const originalClear = localStorage.clear;
            localStorage.clear = function() {
                originalClear.apply(this, arguments);
                window.dispatchEvent(new Event("local_token_change"));
            };
        }

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
        window.addEventListener("local_token_change", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("local_token_change", handleStorageChange);
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}
