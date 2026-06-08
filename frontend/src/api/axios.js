import axios from "axios";

const apiURL = import.meta.env.VITE_API_URL || "http://localhost:5000/";
const baseURL = apiURL.endsWith("/") ? apiURL : `${apiURL}/`;
const instance = axios.create({
    baseURL
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
    res=>res,
    err =>{
        if(err.response?.status === 401 || err.response?.status === 403){
            localStorage.clear();
            window.location.href = "/";
        }
        return Promise.reject(err);
    }
);

export default instance;