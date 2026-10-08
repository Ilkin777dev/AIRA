import axios from "axios";


/*
|--------------------------------------------------------------------------
| API URL
|--------------------------------------------------------------------------
*/

const apiUrl =
    import.meta.env.VITE_API_URL ||
    "http://localhost:8000";


/*
|--------------------------------------------------------------------------
| TOKEN
|--------------------------------------------------------------------------
*/

const TOKEN_KEY =
    "aira_access_token";


export const getAuthToken =
    () => {

        return localStorage.getItem(
            TOKEN_KEY
        );
    };


export const setAuthToken =
    token => {

        if (
            !token
        ) {

            return;
        }


        localStorage.setItem(
            TOKEN_KEY,
            token
        );
    };


export const clearAuthToken =
    () => {

        localStorage.removeItem(
            TOKEN_KEY
        );
    };


/*
|--------------------------------------------------------------------------
| AXIOS
|--------------------------------------------------------------------------
*/

const api =
    axios.create({

        baseURL:
            apiUrl,

        headers: {

            Accept:
                "application/json",

            "X-Requested-With":
                "XMLHttpRequest",
        },


        /*
        |--------------------------------------------------------------------------
        | IMPORTANT
        |--------------------------------------------------------------------------
        |
        | Bearer Token authentication.
        |
        | Cookies are not required anymore.
        |
        */

        withCredentials:
            false,

        withXSRFToken:
            false,
    });


/*
|--------------------------------------------------------------------------
| REQUEST INTERCEPTOR
|--------------------------------------------------------------------------
|
| Every protected request automatically receives:
|
| Authorization: Bearer TOKEN
|
*/

api.interceptors.request.use(
    config => {

        const token =
            getAuthToken();


        if (
            token
        ) {

            config.headers.Authorization =
                `Bearer ${token}`;
        }


        return config;
    },

    error =>
        Promise.reject(
            error
        )
);


/*
|--------------------------------------------------------------------------
| RESPONSE INTERCEPTOR
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(

    response => {

        /*
        |--------------------------------------------------------------------------
        | LOGIN
        |--------------------------------------------------------------------------
        |
        | Login.jsx does not need to be changed.
        | If backend returns access_token, save it automatically.
        |
        */

        if (
            response
                ?.config
                ?.url ===
                "/api/login" &&
            response
                ?.data
                ?.access_token
        ) {

            setAuthToken(
                response
                    .data
                    .access_token
            );
        }


        /*
        |--------------------------------------------------------------------------
        | LOGOUT
        |--------------------------------------------------------------------------
        */

        if (
            response
                ?.config
                ?.url ===
            "/api/logout"
        ) {

            clearAuthToken();
        }


        return response;
    },

    error => {

        /*
        |--------------------------------------------------------------------------
        | INVALID TOKEN
        |--------------------------------------------------------------------------
        */

        if (
            error
                ?.response
                ?.status ===
            401
        ) {

            const requestUrl =
                error
                    ?.config
                    ?.url;


            /*
            |--------------------------------------------------------------------------
            | Do not clear token just because login credentials were incorrect.
            |--------------------------------------------------------------------------
            */

            if (
                requestUrl !==
                "/api/login"
            ) {

                clearAuthToken();
            }
        }


        return Promise.reject(
            error
        );
    }
);


/*
|--------------------------------------------------------------------------
| LEGACY CSRF FUNCTION
|--------------------------------------------------------------------------
|
| Register.jsx and Login.jsx currently call getCsrfCookie().
|
| We keep this function so those files do not need to be rewritten.
|
| Bearer Token authentication does not require CSRF.
|
*/

export const getCsrfCookie =
    async () => {

        return Promise.resolve();
    };


export default api;