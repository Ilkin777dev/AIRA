import {
    useCallback,
    useEffect,
    useRef,
} from "react";

import api from "../../api/axios";


const FLUSH_INTERVAL_MS =
    5000;


/*
|--------------------------------------------------------------------------
| AIRA INTERVIEW PROCTORING HOOK
|--------------------------------------------------------------------------
|
| Сохраняет только exam telemetry:
|
| - process_started / process_stopped
| - window_blur / window_focus
| - blocked_shortcut
| - context_menu_attempt
| - fullscreen_exit / fullscreen_restored
|
| Полный ввод клавиатуры НЕ записывается.
|
*/

export default function useInterviewProctoring(
    interviewId,
    enabled = true
) {

    const queueRef =
        useRef([]);

    const flushInProgressRef =
        useRef(false);

    const startedRef =
        useRef(false);

    const stopPromiseRef =
        useRef(null);


    /*
    |--------------------------------------------------------------------------
    | QUEUE EVENT
    |--------------------------------------------------------------------------
    */

    const queueEvent =
        useCallback(
            event => {

                if (
                    !event?.event_type ||
                    !event?.occurred_at
                ) {

                    return;
                }


                queueRef.current.push(
                    event
                );
            },
            []
        );


    /*
    |--------------------------------------------------------------------------
    | FLUSH EVENTS TO LARAVEL
    |--------------------------------------------------------------------------
    */

    const flushEvents =
        useCallback(
            async () => {

                if (
                    !interviewId ||
                    flushInProgressRef.current ||
                    queueRef.current.length ===
                        0
                ) {

                    return;
                }


                const batch =
                    queueRef.current.splice(
                        0,
                        100
                    );


                flushInProgressRef.current =
                    true;


                try {

                    await api.post(
                        `/api/interviews/${interviewId}/proctoring-events/batch`,
                        {
                            events:
                                batch,
                        }
                    );

                } catch (
                    error
                ) {

                    console.error(
                        "AIRA PROCTORING FLUSH ERROR:",
                        error
                    );


                    /*
                    |--------------------------------------------------------------------------
                    | RETURN UNSAVED EVENTS TO QUEUE
                    |--------------------------------------------------------------------------
                    */

                    queueRef.current =
                        [
                            ...batch,
                            ...queueRef.current,
                        ];

                } finally {

                    flushInProgressRef.current =
                        false;
                }
            },
            [
                interviewId,
            ]
        );


    /*
    |--------------------------------------------------------------------------
    | START / STOP LIFECYCLE
    |--------------------------------------------------------------------------
    */

    useEffect(
        () => {

            if (
                !enabled ||
                !interviewId ||
                !window.electronAPI
                    ?.startProctoring ||
                !window.electronAPI
                    ?.onProctoringEvent
            ) {

                return;
            }


            let disposed =
                false;

            let flushTimer =
                null;


            /*
            |--------------------------------------------------------------------------
            | SUBSCRIBE BEFORE START
            |--------------------------------------------------------------------------
            */

            const unsubscribe =
                window.electronAPI
                    .onProctoringEvent(
                        event => {

                            if (
                                disposed
                            ) {

                                return;
                            }


                            queueEvent(
                                event
                            );
                        }
                    );


            /*
            |--------------------------------------------------------------------------
            | START
            |--------------------------------------------------------------------------
            */

            const start =
                async () => {

                    try {

                        const result =
                            await window
                                .electronAPI
                                .startProctoring();


                        startedRef.current =
                            Boolean(
                                result?.started ||
                                result?.reason ===
                                    "already_active"
                            );


                        flushTimer =
                            window.setInterval(
                                () => {

                                    flushEvents();

                                },
                                FLUSH_INTERVAL_MS
                            );

                    } catch (
                        error
                    ) {

                        console.error(
                            "AIRA PROCTORING START ERROR:",
                            error
                        );
                    }
                };


            start();


            /*
            |--------------------------------------------------------------------------
            | CLEANUP
            |--------------------------------------------------------------------------
            */

            return () => {

                disposed =
                    true;


                if (
                    flushTimer
                ) {

                    window.clearInterval(
                        flushTimer
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | STOP + FINAL FLUSH
                |--------------------------------------------------------------------------
                |
                | React cleanup itself cannot be async,
                | поэтому запускаем финализацию внутри IIFE.
                |
                */

                (
                    async () => {

                        try {

                            if (
                                startedRef.current &&
                                window.electronAPI
                                    ?.stopProctoring
                            ) {

                                const result =
                                    await window
                                        .electronAPI
                                        .stopProctoring();


                                if (
                                    result?.event
                                ) {

                                    queueRef.current.push(
                                        result.event
                                    );
                                }
                            }


                            await flushEvents();

                        } catch (
                            error
                        ) {

                            console.error(
                                "AIRA PROCTORING STOP ERROR:",
                                error
                            );

                        } finally {

                            startedRef.current =
                                false;


                            unsubscribe?.();
                        }
                    }
                )();
            };
        },
        [
            enabled,
            interviewId,
            flushEvents,
            queueEvent,
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | MANUAL STOP
    |--------------------------------------------------------------------------
    |
    | Можно вызвать перед уходом со страницы,
    | если позднее понадобится.
    |
    */

    const stopProctoring =
        useCallback(
            async () => {

                if (
                    stopPromiseRef.current
                ) {

                    return stopPromiseRef.current;
                }


                stopPromiseRef.current =
                    (
                        async () => {

                            try {

                                if (
                                    startedRef.current &&
                                    window.electronAPI
                                        ?.stopProctoring
                                ) {

                                    const result =
                                        await window
                                            .electronAPI
                                            .stopProctoring();


                                    if (
                                        result?.event
                                    ) {

                                        queueRef.current.push(
                                            result.event
                                        );
                                    }
                                }


                                await flushEvents();

                            } finally {

                                startedRef.current =
                                    false;

                                stopPromiseRef.current =
                                    null;
                            }
                        }
                    )();


                return stopPromiseRef.current;
            },
            [
                flushEvents,
            ]
        );


    return {
        flushProctoringEvents:
            flushEvents,

        stopProctoring,
    };
}
