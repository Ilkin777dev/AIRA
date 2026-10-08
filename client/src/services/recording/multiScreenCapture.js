/*
 * Хранит оригинальные MediaStream
 * каждого физического монитора.
 */
let screenStreams = [];


/*
 * Video элементы нужны Canvas,
 * чтобы отрисовывать каждый монитор.
 *
 * В DOM их добавлять не нужно.
 */
let screenVideos = [];


/*
 * Общий Canvas.
 */
let compositeCanvas = null;


/*
 * Цикл отрисовки.
 */
let animationFrameId = null;


/*
 * Финальный MediaStream Canvas.
 */
let compositeStream = null;


/*
 * Получаем stream конкретного
 * Electron screen source.
 */
const captureScreenSource =
    async (sourceId) => {

        const stream =
            await navigator
                .mediaDevices
                .getUserMedia({

                    audio: false,

                    video: {

                        mandatory: {

                            chromeMediaSource:
                                "desktop",

                            chromeMediaSourceId:
                                sourceId,

                            /*
                             * Ограничиваем FPS,
                             * чтобы 3 монитора
                             * не убивали CPU.
                             */
                            maxFrameRate: 20,
                        },

                    },

                });


        return stream;
    };


/*
 * Создаём скрытый HTMLVideoElement
 * для конкретного MediaStream.
 */
const createVideoForStream =
    async (stream) => {

        const video =
            document.createElement(
                "video"
            );


        video.autoplay = true;

        video.muted = true;

        video.playsInline = true;


        video.srcObject =
            stream;


        await video.play();


        /*
         * Ждём реальные размеры
         * видеопотока.
         */
        if (
            video.videoWidth === 0 ||
            video.videoHeight === 0
        ) {

            await new Promise(
                (resolve) => {

                    video.onloadedmetadata =
                        () => {

                            resolve();
                        };
                }
            );
        }


        return video;
    };


/*
 * Определяем расположение
 * экранов внутри итогового Canvas.
 */
const calculateGrid =
    (screenCount) => {

        if (screenCount <= 1) {

            return {
                columns: 1,
                rows: 1,
            };
        }


        if (screenCount === 2) {

            return {
                columns: 2,
                rows: 1,
            };
        }


        if (
            screenCount === 3 ||
            screenCount === 4
        ) {

            return {
                columns: 2,
                rows: 2,
            };
        }


        const columns =
            Math.ceil(
                Math.sqrt(
                    screenCount
                )
            );


        const rows =
            Math.ceil(
                screenCount /
                columns
            );


        return {
            columns,
            rows,
        };
    };


/*
 * Рисуем все экраны
 * внутри единого Canvas.
 */
const startCanvasRendering =
    (
        canvas,
        videos
    ) => {

        const context =
            canvas.getContext(
                "2d"
            );


        if (!context) {

            throw new Error(
                "Canvas 2D context is unavailable."
            );
        }


        const {
            columns,
            rows,
        } = calculateGrid(
            videos.length
        );


        /*
         * Не делаем огромные
         * 3 x 4K Canvas.
         *
         * 1920x1080 достаточно
         * для первой версии.
         */
        canvas.width = 1920;

        canvas.height = 1080;


        const cellWidth =
            canvas.width /
            columns;


        const cellHeight =
            canvas.height /
            rows;


        const draw =
            () => {

                /*
                 * Чёрный background.
                 */
                context.fillStyle =
                    "#000000";


                context.fillRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );


                videos.forEach(
                    (
                        video,
                        index
                    ) => {

                        const column =
                            index %
                            columns;


                        const row =
                            Math.floor(
                                index /
                                columns
                            );


                        const x =
                            column *
                            cellWidth;


                        const y =
                            row *
                            cellHeight;


                        const videoWidth =
                            video.videoWidth;


                        const videoHeight =
                            video.videoHeight;


                        if (
                            !videoWidth ||
                            !videoHeight
                        ) {

                            return;
                        }


                        /*
                         * Сохраняем aspect ratio.
                         */
                        const scale =
                            Math.min(

                                cellWidth /
                                videoWidth,

                                cellHeight /
                                videoHeight
                            );


                        const drawWidth =
                            videoWidth *
                            scale;


                        const drawHeight =
                            videoHeight *
                            scale;


                        const offsetX =
                            x +
                            (
                                cellWidth -
                                drawWidth
                            ) /
                            2;


                        const offsetY =
                            y +
                            (
                                cellHeight -
                                drawHeight
                            ) /
                            2;


                        context.drawImage(
                            video,

                            offsetX,
                            offsetY,

                            drawWidth,
                            drawHeight
                        );


                        /*
                         * Разделительная рамка
                         * между мониторами.
                         */
                        context.strokeStyle =
                            "#555555";


                        context.lineWidth =
                            2;


                        context.strokeRect(
                            x,
                            y,
                            cellWidth,
                            cellHeight
                        );


                        /*
                         * Номер монитора.
                         */
                        context.fillStyle =
                            "rgba(0,0,0,0.7)";


                        context.fillRect(
                            x + 10,
                            y + 10,
                            130,
                            35
                        );


                        context.fillStyle =
                            "#ffffff";


                        context.font =
                            "20px sans-serif";


                        context.fillText(
                            `Screen ${index + 1}`,

                            x + 20,
                            y + 35
                        );
                    }
                );


                animationFrameId =
                    requestAnimationFrame(
                        draw
                    );
            };


        draw();
    };


/*
 * PUBLIC
 *
 * Запускает захват
 * всех обнаруженных мониторов.
 */
export const startMultiScreenCapture =
    async () => {

        /*
         * Защита от двойного запуска.
         */
        if (
            screenStreams.length >
            0
        ) {

            throw new Error(
                "Screen capture is already running."
            );
        }


        if (
            !window
                .electronAPI
                ?.getAllScreens
        ) {

            throw new Error(
                "Multi-screen capture requires Electron."
            );
        }


        const sources =
            await window
                .electronAPI
                .getAllScreens();


        console.log(
            "Detected monitors:",
            sources
        );


        if (
            sources.length === 0
        ) {

            throw new Error(
                "No monitors detected."
            );
        }


        try {

            /*
             * Захватываем каждый
             * монитор отдельно.
             */
            for (
                const source
                of sources
            ) {

                console.log(
                    "Capturing:",
                    source.name,
                    source.id
                );


                const stream =
                    await captureScreenSource(
                        source.id
                    );


                screenStreams.push(
                    stream
                );


                const video =
                    await createVideoForStream(
                        stream
                    );


                screenVideos.push(
                    video
                );
            }


            compositeCanvas =
                document.createElement(
                    "canvas"
                );


            startCanvasRendering(
                compositeCanvas,
                screenVideos
            );


            /*
             * Это уже ОДИН
             * объединённый MediaStream.
             */
            compositeStream =
                compositeCanvas
                    .captureStream(
                        20
                    );


            console.log(
                "Composite stream:",
                compositeStream
            );


            return {

                stream:
                    compositeStream,

                canvas:
                    compositeCanvas,

                monitorCount:
                    sources.length,

                sources:
                    sources,
            };


        } catch (error) {

            /*
             * Если один из мониторов
             * не удалось открыть,
             * выключаем уже открытые.
             */
            stopMultiScreenCapture();


            throw error;
        }
    };


/*
 * PUBLIC
 *
 * Полностью завершает
 * screen capture.
 */
export const stopMultiScreenCapture =
    () => {

        if (
            animationFrameId
        ) {

            cancelAnimationFrame(
                animationFrameId
            );


            animationFrameId =
                null;
        }


        screenStreams.forEach(
            (stream) => {

                stream
                    .getTracks()
                    .forEach(
                        (track) => {

                            track.stop();
                        }
                    );
            }
        );


        screenStreams = [];


        screenVideos.forEach(
            (video) => {

                video.pause();

                video.srcObject =
                    null;
            }
        );


        screenVideos = [];


        if (
            compositeStream
        ) {

            compositeStream
                .getTracks()
                .forEach(
                    (track) => {

                        track.stop();
                    }
                );
        }


        compositeStream =
            null;

        compositeCanvas =
            null;


        console.log(
            "All screen capture stopped."
        );
    };