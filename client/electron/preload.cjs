const {
    contextBridge,
    ipcRenderer,
} = require("electron");


contextBridge.exposeInMainWorld(
    "electronAPI",
    {

        /*
        |--------------------------------------------------------------------------
        | DESKTOP
        |--------------------------------------------------------------------------
        */

        isDesktop:
            true,


        /*
        |--------------------------------------------------------------------------
        | PLATFORM
        |--------------------------------------------------------------------------
        */

        platform:
            process.platform,


        /*
        |--------------------------------------------------------------------------
        | SCREENS
        |--------------------------------------------------------------------------
        */

        getAllScreens:
            () => {

                return ipcRenderer.invoke(
                    "screens:get-all"
                );
            },


        /*
        |--------------------------------------------------------------------------
        | ENABLE / DISABLE EXAM MODE
        |--------------------------------------------------------------------------
        */

        setExamMode:
            enabled => {

                return ipcRenderer.invoke(
                    "exam-mode:set",
                    Boolean(
                        enabled
                    )
                );
            },


        /*
        |--------------------------------------------------------------------------
        | GET EXAM MODE
        |--------------------------------------------------------------------------
        */

        getExamMode:
            () => {

                return ipcRenderer.invoke(
                    "exam-mode:get"
                );
            },


        /*
        |--------------------------------------------------------------------------
        | START PROCTORING
        |--------------------------------------------------------------------------
        */

        startProctoring:
            () => {

                return ipcRenderer.invoke(
                    "proctoring:start"
                );
            },


        /*
        |--------------------------------------------------------------------------
        | STOP PROCTORING
        |--------------------------------------------------------------------------
        */

        stopProctoring:
            () => {

                return ipcRenderer.invoke(
                    "proctoring:stop"
                );
            },


        /*
        |--------------------------------------------------------------------------
        | PROCTORING EVENT LISTENER
        |--------------------------------------------------------------------------
        |
        | Возвращает функцию unsubscribe().
        |
        */

        onProctoringEvent:
            callback => {

                if (
                    typeof callback !==
                    "function"
                ) {

                    return () => {};
                }


                const listener =
                    (
                        event,
                        payload
                    ) => {

                        callback(
                            payload
                        );
                    };


                ipcRenderer.on(
                    "proctoring:event",
                    listener
                );


                return () => {

                    ipcRenderer.removeListener(
                        "proctoring:event",
                        listener
                    );
                };
            },

    }
);
