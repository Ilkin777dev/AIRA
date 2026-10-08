const {
    app,
    BrowserWindow,
    desktopCapturer,
    ipcMain,
    session,
} = require(
    "electron"
);

const path =
    require(
        "path"
    );

const http =
    require(
        "http"
    );

const fs =
    require(
        "fs"
    );

const proctoringService =
    require(
        "./proctoringService.cjs"
    );


/*
|--------------------------------------------------------------------------
| DEVELOPMENT URL
|--------------------------------------------------------------------------
*/

const DEV_ORIGIN =
    "http://localhost:5173";


/*
|--------------------------------------------------------------------------
| PRODUCTION FRONTEND
|--------------------------------------------------------------------------
|
| Production Electron does NOT use file://.
| It serves the Vite build from localhost so Laravel Sanctum can attach
| the SPA session middleware normally.
|
*/

const PROD_HOST =
    "127.0.0.1";

const PROD_PORT =
    4173;

const PROD_ORIGIN =
    `http://localhost:${PROD_PORT}`;

let frontendServer =
    null;


/*
|--------------------------------------------------------------------------
| WINDOWS
|--------------------------------------------------------------------------
*/

let mainWindow =
    null;


/*
|--------------------------------------------------------------------------
| EXAM MODE
|--------------------------------------------------------------------------
*/

const examModeWindows =
    new Map();


const isExamModeEnabled =
    browserWindow => {

        if (
            !browserWindow ||
            browserWindow.isDestroyed()
        ) {

            return false;
        }


        return (
            examModeWindows.get(
                browserWindow.id
            ) === true
        );
    };


const setExamMode = (
    browserWindow,
    enabled
) => {

    if (
        !browserWindow ||
        browserWindow.isDestroyed()
    ) {

        return;
    }


    examModeWindows.set(
        browserWindow.id,
        Boolean(
            enabled
        )
    );


    try {

        if (
            enabled
        ) {

            browserWindow
                .setFullScreenable(
                    true
                );


            browserWindow
                .setFullScreen(
                    true
                );


            browserWindow
                .setAlwaysOnTop(
                    false
                );

        } else {

            browserWindow
                .setFullScreen(
                    false
                );


            browserWindow
                .setAlwaysOnTop(
                    false
                );
        }

    } catch (
        error
    ) {

        console.error(
            "AIRA EXAM MODE ERROR:",
            error
        );
    }
};


/*
|--------------------------------------------------------------------------
| PROCTORING EVENT
|--------------------------------------------------------------------------
*/

const sendProctoringEvent = (
    browserWindow,
    eventType,
    eventData = {}
) => {

    if (
        !browserWindow ||
        browserWindow.isDestroyed()
    ) {

        return;
    }


    if (
        !proctoringService
            .isActive()
    ) {

        return;
    }


    browserWindow
        .webContents
        .send(
            "proctoring:event",
            {
                event_type:
                    eventType,

                event_data:
                    eventData,

                occurred_at:
                    new Date()
                        .toISOString(),
            }
        );
};


/*
|--------------------------------------------------------------------------
| SHORTCUT LABEL
|--------------------------------------------------------------------------
*/

const shortcutLabel =
    input => {

        const parts =
            [];


        if (
            input.control
        ) {

            parts.push(
                "CTRL"
            );
        }


        if (
            input.alt
        ) {

            parts.push(
                "ALT"
            );
        }


        if (
            input.shift
        ) {

            parts.push(
                "SHIFT"
            );
        }


        if (
            input.meta
        ) {

            parts.push(
                "META"
            );
        }


        const key =
            String(
                input.key ||
                ""
            )
                .toUpperCase();


        if (
            key &&
            ![
                "CONTROL",
                "ALT",
                "SHIFT",
                "META",
            ].includes(
                key
            )
        ) {

            parts.push(
                key
            );
        }


        return parts
            .join(
                "+"
            );
    };


/*
|--------------------------------------------------------------------------
| HASH ROUTER / URL SYNC
|--------------------------------------------------------------------------
*/

const syncExamModeWithUrl = (
    browserWindow,
    targetUrl
) => {

    try {

        const parsedUrl =
            new URL(
                targetUrl
            );


        const hashPath =
            parsedUrl.hash
                ?.replace(
                    /^#/,
                    ""
                )
                ?.split(
                    "?"
                )[0] ||
            "";


        const currentPath =
            hashPath.startsWith(
                "/"
            )
                ? hashPath
                : parsedUrl.pathname;


        const isInterviewPage =
            currentPath ===
            "/interview";


        if (
            !isInterviewPage &&
            isExamModeEnabled(
                browserWindow
            )
        ) {

            setExamMode(
                browserWindow,
                false
            );
        }

    } catch (
        error
    ) {

        console.error(
            "AIRA URL SYNC ERROR:",
            error
        );
    }
};


/*
|--------------------------------------------------------------------------
| PRODUCTION FRONTEND SERVER
|--------------------------------------------------------------------------
*/

const getContentType =
    filePath => {

        const extension =
            path.extname(
                filePath
            )
                .toLowerCase();


        const mimeTypes = {

            ".html":
                "text/html; charset=utf-8",

            ".js":
                "text/javascript; charset=utf-8",

            ".mjs":
                "text/javascript; charset=utf-8",

            ".css":
                "text/css; charset=utf-8",

            ".json":
                "application/json; charset=utf-8",

            ".png":
                "image/png",

            ".jpg":
                "image/jpeg",

            ".jpeg":
                "image/jpeg",

            ".gif":
                "image/gif",

            ".svg":
                "image/svg+xml",

            ".webp":
                "image/webp",

            ".ico":
                "image/x-icon",

            ".woff":
                "font/woff",

            ".woff2":
                "font/woff2",

            ".ttf":
                "font/ttf",

            ".mp4":
                "video/mp4",

            ".webm":
                "video/webm",
        };


        return (
            mimeTypes[
                extension
            ] ||
            "application/octet-stream"
        );
    };


const startProductionFrontend =
    () => {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                if (
                    frontendServer
                ) {

                    resolve();

                    return;
                }


                const distDirectory =
                    path.resolve(
                        __dirname,
                        "..",
                        "dist"
                    );


                const indexPath =
                    path.join(
                        distDirectory,
                        "index.html"
                    );


                if (
                    !fs.existsSync(
                        indexPath
                    )
                ) {

                    reject(
                        new Error(
                            `AIRA dist/index.html not found: ${indexPath}`
                        )
                    );

                    return;
                }


                frontendServer =
                    http.createServer(
                        (
                            request,
                            response
                        ) => {

                            try {

                                const requestUrl =
                                    new URL(
                                        request.url ||
                                        "/",
                                        PROD_ORIGIN
                                    );


                                let pathname =
                                    decodeURIComponent(
                                        requestUrl.pathname
                                    );


                                if (
                                    pathname ===
                                    "/"
                                ) {

                                    pathname =
                                        "/index.html";
                                }


                                const relativePath =
                                    pathname
                                        .replace(
                                            /^\/+/,
                                            ""
                                        );


                                let filePath =
                                    path.resolve(
                                        distDirectory,
                                        relativePath
                                    );


                                /*
                                |--------------------------------------------------------------------------
                                | PATH TRAVERSAL PROTECTION
                                |--------------------------------------------------------------------------
                                */

                                if (
                                    !filePath.startsWith(
                                        distDirectory
                                    )
                                ) {

                                    response.writeHead(
                                        403,
                                        {
                                            "Content-Type":
                                                "text/plain; charset=utf-8",
                                        }
                                    );

                                    response.end(
                                        "Forbidden"
                                    );

                                    return;
                                }


                                /*
                                |--------------------------------------------------------------------------
                                | SPA FALLBACK
                                |--------------------------------------------------------------------------
                                */

                                if (
                                    !fs.existsSync(
                                        filePath
                                    ) ||
                                    fs.statSync(
                                        filePath
                                    ).isDirectory()
                                ) {

                                    filePath =
                                        indexPath;
                                }


                                fs.readFile(
                                    filePath,
                                    (
                                        error,
                                        data
                                    ) => {

                                        if (
                                            error
                                        ) {

                                            console.error(
                                                "AIRA FRONTEND READ ERROR:",
                                                error
                                            );


                                            response.writeHead(
                                                500,
                                                {
                                                    "Content-Type":
                                                        "text/plain; charset=utf-8",
                                                }
                                            );


                                            response.end(
                                                "AIRA frontend could not be loaded."
                                            );

                                            return;
                                        }


                                        response.writeHead(
                                            200,
                                            {
                                                "Content-Type":
                                                    getContentType(
                                                        filePath
                                                    ),

                                                "Cache-Control":
                                                    "no-cache",
                                            }
                                        );


                                        response.end(
                                            data
                                        );
                                    }
                                );

                            } catch (
                                error
                            ) {

                                console.error(
                                    "AIRA FRONTEND SERVER ERROR:",
                                    error
                                );


                                response.writeHead(
                                    500,
                                    {
                                        "Content-Type":
                                            "text/plain; charset=utf-8",
                                    }
                                );


                                response.end(
                                    "Internal AIRA error."
                                );
                            }
                        }
                    );


                frontendServer
                    .once(
                        "error",
                        error => {

                            frontendServer =
                                null;


                            reject(
                                error
                            );
                        }
                    );


                frontendServer.listen(
                    PROD_PORT,
                    PROD_HOST,
                    () => {

                        console.log(
                            `AIRA frontend running at ${PROD_ORIGIN}`
                        );


                        resolve();
                    }
                );
            }
        );
    };


const stopProductionFrontend =
    () => {

        if (
            !frontendServer
        ) {

            return;
        }


        try {

            frontendServer.close();

        } catch (
            error
        ) {

            console.error(
                "AIRA FRONTEND SERVER CLOSE ERROR:",
                error
            );
        }


        frontendServer =
            null;
    };


/*
|--------------------------------------------------------------------------
| CREATE WINDOW
|--------------------------------------------------------------------------
*/

const createWindow =
    () => {

        mainWindow =
            new BrowserWindow({
                width:
                    1440,

                height:
                    900,

                minWidth:
                    1100,

                minHeight:
                    700,

                show:
                    false,

                backgroundColor:
                    "#11142B",

                webPreferences: {

                    preload:
                        path.join(
                            __dirname,
                            "preload.cjs"
                        ),

                    nodeIntegration:
                        false,

                    contextIsolation:
                        true,

                    sandbox:
                        false,
                },
            });


        mainWindow
            .setFullScreenable(
                true
            );


        /*
        |--------------------------------------------------------------------------
        | LOAD REACT
        |--------------------------------------------------------------------------
        */

        if (
            app.isPackaged
        ) {

            mainWindow
                .loadURL(
                    `${PROD_ORIGIN}/`
                );

        } else {

            mainWindow
                .loadURL(
                    `${DEV_ORIGIN}/`
                );


            mainWindow
                .webContents
                .openDevTools();
        }


        /*
        |--------------------------------------------------------------------------
        | READY
        |--------------------------------------------------------------------------
        */

        mainWindow
            .once(
                "ready-to-show",
                () => {

                    if (
                        !mainWindow ||
                        mainWindow.isDestroyed()
                    ) {

                        return;
                    }


                    mainWindow
                        .show();
                }
            );


        /*
        |--------------------------------------------------------------------------
        | KEYBOARD SECURITY
        |--------------------------------------------------------------------------
        */

        mainWindow
            .webContents
            .on(
                "before-input-event",
                (
                    event,
                    input
                ) => {

                    if (
                        !mainWindow ||
                        mainWindow.isDestroyed()
                    ) {

                        return;
                    }


                    if (
                        !isExamModeEnabled(
                            mainWindow
                        )
                    ) {

                        return;
                    }


                    const key =
                        String(
                            input.key ||
                            ""
                        )
                            .toLowerCase();


                    const blocked =
                        (
                            input.alt &&
                            input.shift
                        ) ||

                        (
                            input.control &&
                            [
                                "c",
                                "v",
                                "x",
                                "a",
                            ].includes(
                                key
                            )
                        ) ||

                        (
                            input.control &&
                            key ===
                            "insert"
                        ) ||

                        (
                            input.shift &&
                            key ===
                            "insert"
                        ) ||

                        key ===
                        "f12" ||

                        (
                            input.control &&
                            input.shift &&
                            [
                                "i",
                                "j",
                                "c",
                            ].includes(
                                key
                            )
                        );


                    if (
                        blocked
                    ) {

                        event
                            .preventDefault();


                        const shortcut =
                            shortcutLabel(
                                input
                            );


                        sendProctoringEvent(
                            mainWindow,
                            "blocked_shortcut",
                            {
                                shortcut,
                            }
                        );
                    }
                }
            );


        /*
        |--------------------------------------------------------------------------
        | CONTEXT MENU
        |--------------------------------------------------------------------------
        */

        mainWindow
            .webContents
            .on(
                "context-menu",
                event => {

                    if (
                        !mainWindow ||
                        mainWindow.isDestroyed()
                    ) {

                        return;
                    }


                    if (
                        !isExamModeEnabled(
                            mainWindow
                        )
                    ) {

                        return;
                    }


                    event
                        .preventDefault();


                    sendProctoringEvent(
                        mainWindow,
                        "context_menu_attempt"
                    );
                }
            );


        /*
        |--------------------------------------------------------------------------
        | WINDOW FOCUS
        |--------------------------------------------------------------------------
        */

        mainWindow
            .on(
                "blur",
                () => {

                    if (
                        !mainWindow ||
                        mainWindow.isDestroyed()
                    ) {

                        return;
                    }


                    if (
                        isExamModeEnabled(
                            mainWindow
                        )
                    ) {

                        sendProctoringEvent(
                            mainWindow,
                            "window_blur"
                        );
                    }
                }
            );


        mainWindow
            .on(
                "focus",
                () => {

                    if (
                        !mainWindow ||
                        mainWindow.isDestroyed()
                    ) {

                        return;
                    }


                    if (
                        isExamModeEnabled(
                            mainWindow
                        )
                    ) {

                        sendProctoringEvent(
                            mainWindow,
                            "window_focus"
                        );
                    }
                }
            );


        /*
        |--------------------------------------------------------------------------
        | FULLSCREEN PROTECTION
        |--------------------------------------------------------------------------
        */

        mainWindow
            .on(
                "leave-full-screen",
                () => {

                    if (
                        !mainWindow ||
                        mainWindow.isDestroyed()
                    ) {

                        return;
                    }


                    if (
                        !isExamModeEnabled(
                            mainWindow
                        )
                    ) {

                        return;
                    }


                    sendProctoringEvent(
                        mainWindow,
                        "fullscreen_exit"
                    );


                    setTimeout(
                        () => {

                            if (
                                !mainWindow ||
                                mainWindow.isDestroyed()
                            ) {

                                return;
                            }


                            if (
                                !isExamModeEnabled(
                                    mainWindow
                                )
                            ) {

                                return;
                            }


                            mainWindow
                                .setFullScreen(
                                    true
                                );


                            sendProctoringEvent(
                                mainWindow,
                                "fullscreen_restored"
                            );

                        },
                        100
                    );
                }
            );


        /*
        |--------------------------------------------------------------------------
        | URL NAVIGATION
        |--------------------------------------------------------------------------
        */

        mainWindow
            .webContents
            .on(
                "did-navigate",
                (
                    event,
                    url
                ) => {

                    syncExamModeWithUrl(
                        mainWindow,
                        url
                    );
                }
            );


        mainWindow
            .webContents
            .on(
                "did-navigate-in-page",
                (
                    event,
                    url
                ) => {

                    syncExamModeWithUrl(
                        mainWindow,
                        url
                    );
                }
            );


        /*
        |--------------------------------------------------------------------------
        | CLOSED
        |--------------------------------------------------------------------------
        */

        mainWindow
            .on(
                "closed",
                () => {

                    if (
                        mainWindow
                    ) {

                        examModeWindows
                            .delete(
                                mainWindow.id
                            );
                    }


                    mainWindow =
                        null;
                }
            );
    };


/*
|--------------------------------------------------------------------------
| MEDIA PERMISSIONS
|--------------------------------------------------------------------------
*/

const configurePermissions =
    () => {

        const defaultSession =
            session
                .defaultSession;


        defaultSession
            .setPermissionCheckHandler(
                (
                    webContents,
                    permission,
                    requestingOrigin
                ) => {

                    const isAllowedOrigin =
                        requestingOrigin
                            .startsWith(
                                DEV_ORIGIN
                            ) ||
                        (
                            app.isPackaged &&
                            requestingOrigin
                                .startsWith(
                                    PROD_ORIGIN
                                )
                        );


                    if (
                        permission ===
                            "media" &&
                        isAllowedOrigin
                    ) {

                        return true;
                    }


                    return false;
                }
            );


        defaultSession
            .setPermissionRequestHandler(
                (
                    webContents,
                    permission,
                    callback,
                    details
                ) => {

                    const requestingUrl =
                        details
                            ?.requestingUrl ||
                        "";


                    const isAllowedUrl =
                        requestingUrl
                            .startsWith(
                                DEV_ORIGIN
                            ) ||
                        (
                            app.isPackaged &&
                            requestingUrl
                                .startsWith(
                                    PROD_ORIGIN
                                )
                        );


                    if (
                        permission ===
                            "media" &&
                        isAllowedUrl
                    ) {

                        callback(
                            true
                        );

                        return;
                    }


                    callback(
                        false
                    );
                }
            );
    };


/*
|--------------------------------------------------------------------------
| SCREEN CAPTURE
|--------------------------------------------------------------------------
*/

ipcMain
    .handle(
        "screens:get-all",
        async () => {

            const sources =
                await desktopCapturer
                    .getSources({
                        types: [
                            "screen",
                        ],

                        thumbnailSize: {
                            width:
                                0,

                            height:
                                0,
                        },
                    });


            return sources
                .map(
                    source => ({
                        id:
                            source.id,

                        name:
                            source.name,

                        display_id:
                            source.display_id,
                    })
                );
        }
    );


/*
|--------------------------------------------------------------------------
| EXAM MODE IPC
|--------------------------------------------------------------------------
*/

ipcMain
    .handle(
        "exam-mode:set",
        (
            event,
            enabled
        ) => {

            const browserWindow =
                BrowserWindow
                    .fromWebContents(
                        event.sender
                    );


            if (
                !browserWindow
            ) {

                return false;
            }


            setExamMode(
                browserWindow,
                Boolean(
                    enabled
                )
            );


            return isExamModeEnabled(
                browserWindow
            );
        }
    );


ipcMain
    .handle(
        "exam-mode:get",
        event => {

            const browserWindow =
                BrowserWindow
                    .fromWebContents(
                        event.sender
                    );


            if (
                !browserWindow
            ) {

                return false;
            }


            return isExamModeEnabled(
                browserWindow
            );
        }
    );


/*
|--------------------------------------------------------------------------
| PROCTORING IPC
|--------------------------------------------------------------------------
*/

ipcMain
    .handle(
        "proctoring:start",
        async event => {

            const browserWindow =
                BrowserWindow
                    .fromWebContents(
                        event.sender
                    );


            if (
                !browserWindow
            ) {

                return {
                    started:
                        false,

                    message:
                        "Window not found.",
                };
            }


            return await proctoringService
                .start(
                    payload => {

                        if (
                            !browserWindow ||
                            browserWindow.isDestroyed()
                        ) {

                            return;
                        }


                        browserWindow
                            .webContents
                            .send(
                                "proctoring:event",
                                payload
                            );
                    }
                );
        }
    );


ipcMain
    .handle(
        "proctoring:stop",
        async event => {

            const browserWindow =
                BrowserWindow
                    .fromWebContents(
                        event.sender
                    );


            const result =
                await proctoringService
                    .stop();


            if (
                result
                    ?.event &&
                browserWindow &&
                !browserWindow
                    .isDestroyed()
            ) {

                browserWindow
                    .webContents
                    .send(
                        "proctoring:event",
                        result.event
                    );
            }


            return result;
        }
    );


/*
|--------------------------------------------------------------------------
| SINGLE INSTANCE
|--------------------------------------------------------------------------
*/

const gotSingleInstanceLock =
    app.requestSingleInstanceLock();


if (
    !gotSingleInstanceLock
) {

    app.quit();

} else {

    app.on(
        "second-instance",
        () => {

            if (
                !mainWindow ||
                mainWindow.isDestroyed()
            ) {

                return;
            }


            if (
                mainWindow.isMinimized()
            ) {

                mainWindow.restore();
            }


            mainWindow.show();

            mainWindow.focus();
        }
    );


    /*
    |--------------------------------------------------------------------------
    | APP READY
    |--------------------------------------------------------------------------
    */

    app
        .whenReady()
        .then(
            async () => {

                configurePermissions();


                if (
                    app.isPackaged
                ) {

                    try {

                        await startProductionFrontend();

                    } catch (
                        error
                    ) {

                        console.error(
                            "AIRA PRODUCTION FRONTEND START ERROR:",
                            error
                        );


                        app.quit();

                        return;
                    }
                }


                createWindow();


                app
                    .on(
                        "activate",
                        () => {

                            if (
                                BrowserWindow
                                    .getAllWindows()
                                    .length ===
                                0
                            ) {

                                createWindow();
                            }
                        }
                    );
            }
        );
}


/*
|--------------------------------------------------------------------------
| BEFORE QUIT
|--------------------------------------------------------------------------
*/

app
    .on(
        "before-quit",
        () => {

            stopProductionFrontend();
        }
    );


/*
|--------------------------------------------------------------------------
| CLOSE APP
|--------------------------------------------------------------------------
*/

app
    .on(
        "window-all-closed",
        () => {

            if (
                process.platform !==
                "darwin"
            ) {

                app.quit();
            }
        }
    );
