import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";


export default defineConfig({

    /*
    |--------------------------------------------------------------------------
    | ELECTRON FILE:// SUPPORT
    |--------------------------------------------------------------------------
    |
    | Production build будет загружаться напрямую из dist/index.html,
    | поэтому пути к assets должны быть относительными.
    |
    */

    base:
        "./",


    plugins: [

        react(),

        tailwindcss(),
    ],


    build: {

        outDir:
            "dist",

        emptyOutDir:
            true,
    },
});