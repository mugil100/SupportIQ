import axios from "axios";

const apiURL = import.meta.env.VITE_API_URL || "http://localhost:5000/";
const baseURL = apiURL.endsWith("/") ? apiURL : `${apiURL}/`;
const instance = axios.create({
    baseURL,
    withCredentials: true
});

// attach token to every request


instance.interceptors.request.use(config=>{
    const token = localStorage.getItem("token");
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// auto logout if invalid token/ expired

instance.interceptors.response.use(
    res => res,
    async (err) => {
        const originalRequest = err.config;

        if ((err.response?.status === 401 || err.response?.status === 403) && !originalRequest._retry) {
            // Check if the failed request was already a refresh attempt to prevent infinite loops
            if (originalRequest.url.includes('/refresh')) {
                localStorage.clear();
                window.location.href = "/";
                return Promise.reject(err);
            }

            originalRequest._retry = true;

            try {
                const response = await instance.post("/refresh");
                if (response.data?.token) {
                    localStorage.setItem("token", response.data.token);
                    instance.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
                    originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
                    return instance(originalRequest);
                }
            } catch (refreshErr) {
                // Refresh failed (e.g. refresh token expired or missing)
                localStorage.clear();
                window.location.href = "/";
                return Promise.reject(refreshErr);
            }
        }
        
        return Promise.reject(err);
    }
);

export default instance;