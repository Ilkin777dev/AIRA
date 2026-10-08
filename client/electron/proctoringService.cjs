const {
    execFile,
} = require("child_process");

const {
    promisify,
} = require("util");


const execFileAsync =
    promisify(
        execFile
    );


let active = false;

let interval = null;

let previousProcesses =
    new Set();


/*
|--------------------------------------------------------------------------
| CREATE EVENT
|--------------------------------------------------------------------------
*/

const createEvent = (
    eventType,
    eventData = null
) => {

    return {
        event_type:
            eventType,

        event_data:
            eventData,

        occurred_at:
            new Date()
                .toISOString(),
    };
};


/*
|--------------------------------------------------------------------------
| PARSE WINDOWS TASKLIST
|--------------------------------------------------------------------------
*/

const parseTaskList = (
    output
) => {

    const processes =
        new Set();


    const lines =
        String(
            output || ""
        )
            .split(
                /\r?\n/
            )
            .filter(
                Boolean
            );


    for (
        const line of lines
    ) {

        const match =
            line.match(
                /^"([^"]+)"/
            );


        if (
            match?.[1]
        ) {

            processes.add(
                match[1]
                    .trim()
                    .toLowerCase()
            );
        }
    }


    return processes;
};


/*
|--------------------------------------------------------------------------
| GET RUNNING PROCESSES
|--------------------------------------------------------------------------
|
| Сейчас AIRA desktop используется на Windows.
| Мы собираем только имена процессов.
| Command line, содержимое окон и ввод пользователя не собираются.
|
*/

const getProcesses =
    async () => {

        if (
            process.platform !==
            "win32"
        ) {

            return new Set();
        }


        try {

            const {
                stdout,
            } =
                await execFileAsync(
                    "tasklist",
                    [
                        "/FO",
                        "CSV",
                        "/NH",
                    ],
                    {
                        windowsHide:
                            true,
                    }
                );


            return parseTaskList(
                stdout
            );

        } catch (
            error
        ) {

            console.error(
                "AIRA PROCTORING TASKLIST ERROR:",
                error
            );


            return new Set();
        }
    };


/*
|--------------------------------------------------------------------------
| START PROCTORING
|--------------------------------------------------------------------------
*/

const start =
    async (
        emitEvent
    ) => {

        if (
            active
        ) {

            return {
                started:
                    false,

                reason:
                    "already_active",
            };
        }


        active = true;


        previousProcesses =
            await getProcesses();


        emitEvent(
            createEvent(
                "proctoring_started",
                {
                    platform:
                        process.platform,

                    initial_process_count:
                        previousProcesses.size,

                    processes:
                        Array.from(
                            previousProcesses
                        ),
                }
            )
        );


        interval =
            setInterval(
                async () => {

                    if (
                        !active
                    ) {

                        return;
                    }


                    const currentProcesses =
                        await getProcesses();


                    /*
                    |--------------------------------------------------------------------------
                    | PROCESS STARTED
                    |--------------------------------------------------------------------------
                    */

                    for (
                        const processName
                        of currentProcesses
                    ) {

                        if (
                            !previousProcesses.has(
                                processName
                            )
                        ) {

                            emitEvent(
                                createEvent(
                                    "process_started",
                                    {
                                        process:
                                            processName,
                                    }
                                )
                            );
                        }
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | PROCESS STOPPED
                    |--------------------------------------------------------------------------
                    */

                    for (
                        const processName
                        of previousProcesses
                    ) {

                        if (
                            !currentProcesses.has(
                                processName
                            )
                        ) {

                            emitEvent(
                                createEvent(
                                    "process_stopped",
                                    {
                                        process:
                                            processName,
                                    }
                                )
                            );
                        }
                    }


                    previousProcesses =
                        currentProcesses;

                },
                10000
            );


        return {
            started:
                true,

            process_count:
                previousProcesses.size,
        };
    };


/*
|--------------------------------------------------------------------------
| STOP PROCTORING
|--------------------------------------------------------------------------
*/

const stop =
    () => {

        if (
            !active
        ) {

            return {
                stopped:
                    false,

                event:
                    null,
            };
        }


        active = false;


        if (
            interval
        ) {

            clearInterval(
                interval
            );

            interval = null;
        }


        previousProcesses =
            new Set();


        return {
            stopped:
                true,

            event:
                createEvent(
                    "proctoring_stopped"
                ),
        };
    };


/*
|--------------------------------------------------------------------------
| ACTIVE
|--------------------------------------------------------------------------
*/

const isActive =
    () => active;


module.exports = {
    start,
    stop,
    isActive,
    createEvent,
};
