import api from "../../api/axios.js";

import {
    startMultiScreenCapture,
    stopMultiScreenCapture,
} from "./multiScreenCapture.js";

import {
    startDeviceCapture,
    stopDeviceCapture,
} from "./deviceCapture.js";


/*
|--------------------------------------------------------------------------
| INTERNAL STATE
|--------------------------------------------------------------------------
*/

let mediaRecorder = null;

let outputCanvas = null;
let outputContext = null;

let outputStream = null;

let webcamVideo = null;

let animationFrameId = null;

let recordingId = null;

let chunkIndex = 0;

let recordingStartedAt = null;

let uploadQueue = Promise.resolve();

let recordingError = null;

let isStopping = false;


/*
|--------------------------------------------------------------------------
| MIME TYPE
|--------------------------------------------------------------------------
*/

const getSupportedMimeType = () => {

    const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
    ];


    for (const mimeType of mimeTypes) {

        if (
            MediaRecorder.isTypeSupported(
                mimeType
            )
        ) {
            return mimeType;
        }
    }


    return "";
};


/*
|--------------------------------------------------------------------------
| CREATE RECORDING SESSION
|--------------------------------------------------------------------------
*/

const createRecordingSession = async (
    interviewId
) => {

    const response =
        await api.post(
            `/api/interviews/${interviewId}/recording/start`
        );


    if (
        !response.data
            ?.recording
            ?.id
    ) {

        throw new Error(
            "Recording session ID was not returned by backend."
        );
    }


    return response.data.recording;
};


/*
|--------------------------------------------------------------------------
| UPLOAD CHUNK
|--------------------------------------------------------------------------
*/

const uploadChunk = async (
    blob,
    index,
    retryCount = 0
) => {

    if (!recordingId) {

        throw new Error(
            "Recording ID is missing."
        );
    }


    if (
        !blob ||
        blob.size === 0
    ) {

        return;
    }


    const formData =
        new FormData();


    formData.append(
        "chunk",
        blob,
        `chunk_${String(index).padStart(
            6,
            "0"
        )}.webm`
    );


    formData.append(
        "chunk_index",
        String(index)
    );


    try {

        const response =
            await api.post(
                `/api/interview-recordings/${recordingId}/chunks`,
                formData,
                {
                    headers: {
                        Accept:
                            "application/json",
                    },
                }
            );


        console.log(
            `CHUNK ${index} UPLOADED:`,
            response.data
        );


        return response.data;


    } catch (error) {

        console.error(
            `CHUNK ${index} UPLOAD FAILED:`,
            error.response?.data ||
            error
        );


        /*
         * Максимум 3 попытки.
         */
        if (retryCount < 2) {

            console.warn(
                `Retrying chunk ${index}. Attempt ${
                    retryCount + 2
                }/3`
            );


            await new Promise(
                (resolve) =>
                    setTimeout(
                        resolve,
                        1500
                    )
            );


            return uploadChunk(
                blob,
                index,
                retryCount + 1
            );
        }


        throw error;
    }
};


/*
|--------------------------------------------------------------------------
| ADD CHUNK TO UPLOAD QUEUE
|--------------------------------------------------------------------------
*/

const queueChunkUpload = (
    blob,
    index
) => {

    uploadQueue =
        uploadQueue
            .then(() =>
                uploadChunk(
                    blob,
                    index
                )
            )
            .catch((error) => {

                recordingError =
                    error;


                console.error(
                    "Recording upload queue error:",
                    error
                );
            });


    return uploadQueue;
};


/*
|--------------------------------------------------------------------------
| PREPARE WEBCAM VIDEO
|--------------------------------------------------------------------------
*/

const createWebcamVideo = async (
    deviceStream
) => {

    const video =
        document.createElement(
            "video"
        );


    video.autoplay =
        true;

    video.muted =
        true;

    video.playsInline =
        true;


    video.srcObject =
        deviceStream;


    await video.play();


    return video;
};


/*
|--------------------------------------------------------------------------
| DRAW FINAL RECORDING FRAME
|--------------------------------------------------------------------------
*/

const drawFrame = (
    screenCanvas,
    webcam
) => {

    if (
        !outputCanvas ||
        !outputContext
    ) {
        return;
    }


    /*
     * -----------------------------------------------------
     * SCREEN
     * -----------------------------------------------------
     */

    outputContext.drawImage(
        screenCanvas,
        0,
        0,
        outputCanvas.width,
        outputCanvas.height
    );


    /*
     * -----------------------------------------------------
     * WEBCAM OVERLAY
     * -----------------------------------------------------
     */

    if (
        webcam &&
        webcam.readyState >= 2 &&
        webcam.videoWidth > 0 &&
        webcam.videoHeight > 0
    ) {

        const overlayWidth =
            320;

        const overlayHeight =
            180;

        const margin =
            30;


        const targetX =
            outputCanvas.width -
            overlayWidth -
            margin;

        const targetY =
            outputCanvas.height -
            overlayHeight -
            margin;


        const sourceWidth =
            webcam.videoWidth;

        const sourceHeight =
            webcam.videoHeight;


        const sourceRatio =
            sourceWidth /
            sourceHeight;

        const targetRatio =
            overlayWidth /
            overlayHeight;


        let sx =
            0;

        let sy =
            0;

        let sw =
            sourceWidth;

        let sh =
            sourceHeight;


        /*
         * Crop webcam to 16:9
         * without distortion.
         */
        if (
            sourceRatio >
            targetRatio
        ) {

            sw =
                sourceHeight *
                targetRatio;

            sx =
                (
                    sourceWidth -
                    sw
                ) / 2;

        } else {

            sh =
                sourceWidth /
                targetRatio;

            sy =
                (
                    sourceHeight -
                    sh
                ) / 2;
        }


        /*
         * Webcam background.
         */
        outputContext.fillStyle =
            "#000000";

        outputContext.fillRect(
            targetX - 4,
            targetY - 4,
            overlayWidth + 8,
            overlayHeight + 8
        );


        outputContext.drawImage(
            webcam,
            sx,
            sy,
            sw,
            sh,
            targetX,
            targetY,
            overlayWidth,
            overlayHeight
        );
    }


    animationFrameId =
        requestAnimationFrame(
            () =>
                drawFrame(
                    screenCanvas,
                    webcam
                )
        );
};


/*
|--------------------------------------------------------------------------
| START INTERVIEW RECORDING
|--------------------------------------------------------------------------
*/

export const startInterviewRecording =
    async (
        interviewId
    ) => {

        if (!interviewId) {

            throw new Error(
                "Interview ID is required."
            );
        }


        if (
            mediaRecorder &&
            mediaRecorder.state !==
                "inactive"
        ) {

            throw new Error(
                "Interview recording is already running."
            );
        }


        /*
         * Reset previous state.
         */
        recordingError =
            null;

        isStopping =
            false;

        chunkIndex =
            0;

        uploadQueue =
            Promise.resolve();


        try {

            /*
             * -------------------------------------------------
             * 1. CREATE BACKEND RECORDING SESSION
             * -------------------------------------------------
             */

            const recording =
                await createRecordingSession(
                    interviewId
                );


            recordingId =
                recording.id;


            console.log(
                "RECORDING SESSION:",
                recording
            );


            /*
             * -------------------------------------------------
             * 2. CAPTURE ALL MONITORS
             * -------------------------------------------------
             */

            const screenCapture =
                await startMultiScreenCapture();


            if (
                !screenCapture
                    ?.stream ||
                !screenCapture
                    ?.canvas
            ) {

                throw new Error(
                    "Failed to start screen capture."
                );
            }


            /*
             * -------------------------------------------------
             * 3. CAPTURE CAMERA + MICROPHONE
             * -------------------------------------------------
             */

            const deviceCapture =
                await startDeviceCapture();


            if (
                !deviceCapture
                    ?.stream
            ) {

                throw new Error(
                    "Failed to start camera and microphone capture."
                );
            }


            /*
             * -------------------------------------------------
             * 4. WEBCAM VIDEO
             * -------------------------------------------------
             */

            webcamVideo =
                await createWebcamVideo(
                    deviceCapture.stream
                );


            /*
             * -------------------------------------------------
             * 5. FINAL OUTPUT CANVAS
             * -------------------------------------------------
             */

            outputCanvas =
                document.createElement(
                    "canvas"
                );


            outputCanvas.width =
                1920;

            outputCanvas.height =
                1080;


            outputContext =
                outputCanvas.getContext(
                    "2d"
                );


            if (!outputContext) {

                throw new Error(
                    "Could not create recording canvas context."
                );
            }


            /*
             * -------------------------------------------------
             * 6. START DRAW LOOP
             * -------------------------------------------------
             */

            drawFrame(
                screenCapture.canvas,
                webcamVideo
            );


            /*
             * -------------------------------------------------
             * 7. VIDEO STREAM FROM FINAL CANVAS
             * -------------------------------------------------
             */

            const canvasStream =
                outputCanvas.captureStream(
                    20
                );


            const videoTrack =
                canvasStream
                    .getVideoTracks()[0];


            if (!videoTrack) {

                throw new Error(
                    "Recording video track is missing."
                );
            }


            /*
             * -------------------------------------------------
             * 8. MICROPHONE TRACK
             * -------------------------------------------------
             */

            const microphoneTrack =
                deviceCapture.stream
                    .getAudioTracks()[0];


            if (!microphoneTrack) {

                throw new Error(
                    "Microphone track is missing."
                );
            }


            /*
             * -------------------------------------------------
             * 9. FINAL RECORDING STREAM
             * -------------------------------------------------
             */

            outputStream =
                new MediaStream([
                    videoTrack,
                    microphoneTrack,
                ]);


            /*
             * -------------------------------------------------
             * 10. MEDIA RECORDER
             * -------------------------------------------------
             */

            const mimeType =
                getSupportedMimeType();


            const options = {
                videoBitsPerSecond:
                    4_000_000,

                audioBitsPerSecond:
                    128_000,
            };


            if (mimeType) {

                options.mimeType =
                    mimeType;
            }


            mediaRecorder =
                new MediaRecorder(
                    outputStream,
                    options
                );


            /*
             * -------------------------------------------------
             * 11. CHUNK HANDLER
             * -------------------------------------------------
             */

            mediaRecorder.ondataavailable =
                (event) => {

                    if (
                        !event.data ||
                        event.data.size === 0
                    ) {
                        return;
                    }


                    const currentIndex =
                        chunkIndex;


                    chunkIndex +=
                        1;


                    console.log(
                        `RECORDING CHUNK ${currentIndex}:`,
                        `${event.data.size} bytes`
                    );


                    /*
                     * В Blob ничего больше
                     * не складываем.
                     *
                     * Сразу отправляем Laravel.
                     */
                    queueChunkUpload(
                        event.data,
                        currentIndex
                    );
                };


            /*
             * -------------------------------------------------
             * 12. ERROR HANDLER
             * -------------------------------------------------
             */

            mediaRecorder.onerror =
                (event) => {

                    console.error(
                        "MediaRecorder error:",
                        event.error ||
                        event
                    );


                    recordingError =
                        event.error ||
                        new Error(
                            "MediaRecorder error."
                        );
                };


            /*
             * -------------------------------------------------
             * 13. START
             * -------------------------------------------------
             *
             * Каждые 5000ms браузер отдаёт
             * очередной Blob.
             */

            mediaRecorder.start(
                5000
            );


            recordingStartedAt =
                Date.now();


            console.log(
                "INTERVIEW RECORDING STARTED"
            );


            return {
                recordingId,

                stream:
                    outputStream,

                canvas:
                    outputCanvas,

                monitorCount:
                    screenCapture
                        .monitorCount,

                mimeType:
                    mediaRecorder
                        .mimeType,
            };


        } catch (error) {

            console.error(
                "Failed to start interview recording:",
                error
            );


            await cleanupRecording();


            throw error;
        }
    };


/*
|--------------------------------------------------------------------------
| WAIT FOR MEDIA RECORDER STOP
|--------------------------------------------------------------------------
*/

const stopMediaRecorder =
    () => {

        return new Promise(
            (resolve) => {

                if (
                    !mediaRecorder ||
                    mediaRecorder.state ===
                        "inactive"
                ) {

                    resolve();

                    return;
                }


                mediaRecorder.onstop =
                    () => {

                        console.log(
                            "MediaRecorder stopped."
                        );

                        resolve();
                    };


                /*
                 * requestData() просит MediaRecorder
                 * отдать последний неполный chunk
                 * перед stop().
                 */
                if (
                    mediaRecorder.state ===
                    "recording"
                ) {

                    try {

                        mediaRecorder
                            .requestData();

                    } catch (error) {

                        console.warn(
                            "requestData failed:",
                            error
                        );
                    }
                }


                mediaRecorder.stop();
            }
        );
    };


/*
|--------------------------------------------------------------------------
| FINALIZE BACKEND RECORDING
|--------------------------------------------------------------------------
*/

const finalizeRecording =
    async (
        durationSeconds
    ) => {

        if (!recordingId) {

            throw new Error(
                "Recording ID is missing."
            );
        }


        const response =
            await api.post(
                `/api/interview-recordings/${recordingId}/finalize`,
                {
                    duration_seconds:
                        durationSeconds,
                }
            );


        return response.data;
    };


/*
|--------------------------------------------------------------------------
| STOP INTERVIEW RECORDING
|--------------------------------------------------------------------------
*/

export const stopInterviewRecording =
    async () => {

        if (isStopping) {

            console.warn(
                "Recording is already stopping."
            );

            return null;
        }


        isStopping =
            true;


        try {

            /*
             * -------------------------------------------------
             * 1. STOP MEDIA RECORDER
             * -------------------------------------------------
             */

            await stopMediaRecorder();


            /*
             * -------------------------------------------------
             * 2. WAIT UNTIL ALL CHUNKS FINISH UPLOADING
             * -------------------------------------------------
             */

            console.log(
                "Waiting for recording chunks..."
            );


            await uploadQueue;


            /*
             * Если хоть один chunk окончательно
             * не загрузился после retries —
             * не делаем finalize.
             */
            if (recordingError) {

                throw recordingError;
            }


            /*
             * -------------------------------------------------
             * 3. CALCULATE DURATION
             * -------------------------------------------------
             */

            let durationSeconds =
                null;


            if (recordingStartedAt) {

                durationSeconds =
                    Math.max(
                        0,
                        Math.round(
                            (
                                Date.now() -
                                recordingStartedAt
                            ) / 1000
                        )
                    );
            }


            /*
             * -------------------------------------------------
             * 4. FINALIZE BACKEND SESSION
             * -------------------------------------------------
             */

            const result =
                await finalizeRecording(
                    durationSeconds
                );


            console.log(
                "RECORDING FINALIZED:",
                result
            );


            /*
             * -------------------------------------------------
             * 5. CLEANUP DEVICES
             * -------------------------------------------------
             */

            await cleanupRecording();


            return result;


        } catch (error) {

            console.error(
                "Failed to stop/finalize recording:",
                error.response?.data ||
                error
            );


            /*
             * Даже если backend finalize упал,
             * устройства нельзя оставлять включёнными.
             */
            await cleanupRecording();


            throw error;


        } finally {

            isStopping =
                false;
        }
    };


/*
|--------------------------------------------------------------------------
| CLEANUP
|--------------------------------------------------------------------------
*/

const cleanupRecording =
    async () => {

        /*
         * Animation.
         */
        if (animationFrameId) {

            cancelAnimationFrame(
                animationFrameId
            );

            animationFrameId =
                null;
        }


        /*
         * Webcam HTML video.
         */
        if (webcamVideo) {

            webcamVideo.pause();

            webcamVideo.srcObject =
                null;

            webcamVideo =
                null;
        }


        /*
         * Final output stream.
         */
        if (outputStream) {

            outputStream
                .getTracks()
                .forEach(
                    (track) =>
                        track.stop()
                );

            outputStream =
                null;
        }


        /*
         * Camera + microphone.
         */
        try {

            stopDeviceCapture();

        } catch (error) {

            console.warn(
                "Device cleanup error:",
                error
            );
        }


        /*
         * All monitors.
         */
        try {

            stopMultiScreenCapture();

        } catch (error) {

            console.warn(
                "Screen cleanup error:",
                error
            );
        }


        mediaRecorder =
            null;

        outputCanvas =
            null;

        outputContext =
            null;

        recordingStartedAt =
            null;
    };


/*
|--------------------------------------------------------------------------
| RECORDING STATE
|--------------------------------------------------------------------------
*/

export const isInterviewRecording =
    () => {

        return Boolean(
            mediaRecorder &&
            mediaRecorder.state ===
                "recording"
        );
    };


export const getRecordingId =
    () => {

        return recordingId;
    };