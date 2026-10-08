import { useEffect, useRef, useState } from "react";

import {
    startInterviewRecording,
    stopInterviewRecording,
} from "../services/recording/interviewRecorder.js";

function InterviewRecordingTest() {
    const previewRef = useRef(null);

    const liveStreamRef = useRef(null);

    const [isRecording, setIsRecording] = useState(false);

    const [monitorCount, setMonitorCount] = useState(0);

    const [recordingUrl, setRecordingUrl] = useState("");

    const [recordingSize, setRecordingSize] = useState(0);

    const [error, setError] = useState("");

    /*
     * =====================================================
     * LIVE PREVIEW
     * =====================================================
     *
     * Важно:
     *
     * Сначала React должен отрисовать <video>,
     * и только потом мы подключаем MediaStream.
     *
     * Иначе previewRef.current === null
     * и получаем чёрный экран.
     */

    useEffect(() => {
        const attachLiveStream = async () => {
            if (!isRecording || !previewRef.current || !liveStreamRef.current) {
                return;
            }

            try {
                previewRef.current.srcObject = liveStreamRef.current;

                await previewRef.current.play();

                console.log("Live preview connected.");
            } catch (error) {
                console.error("Live preview error:", error);
            }
        };

        attachLiveStream();
    }, [isRecording]);

    /*
     * =====================================================
     * START RECORDING
     * =====================================================
     */

    const startRecording = async () => {
        try {
            setError("");

            /*
             * Удаляем предыдущую
             * локальную запись.
             */
            if (recordingUrl) {
                URL.revokeObjectURL(recordingUrl);

                setRecordingUrl("");

                setRecordingSize(0);
            }

            /*
             * Запускаем:
             *
             * All monitors
             * +
             * Webcam
             * +
             * Microphone
             */
            const result = await startInterviewRecording();

            /*
             * Сохраняем final MediaStream.
             */
            liveStreamRef.current = result.stream;

            /*
             * Количество мониторов.
             */
            setMonitorCount(result.monitorCount);

            /*
             * После этого React
             * создаст <video>.
             *
             * useEffect выше
             * подключит stream.
             */
            setIsRecording(true);

            console.log("Recording test started.");

            console.log("Final stream:", result.stream);
        } catch (error) {
            console.error("Start recording error:", error);

            liveStreamRef.current = null;

            setIsRecording(false);

            setError(error.message || "Unable to start recording.");
        }
    };

    /*
     * =====================================================
     * STOP RECORDING
     * =====================================================
     */

    const stopRecording = async () => {
        try {
            const result = await stopInterviewRecording();

            /*
             * Отключаем live preview.
             */
            if (previewRef.current) {
                previewRef.current.srcObject = null;
            }

            liveStreamRef.current = null;

            /*
             * Создаём URL для
             * записанного Blob.
             */
            const url = URL.createObjectURL(result.blob);

            setRecordingUrl(url);

            setRecordingSize(result.size);

            setIsRecording(false);

            console.log("Recording blob:", result.blob);

            console.log("Recording MIME:", result.mimeType);
        } catch (error) {
            console.error("Stop recording error:", error);

            setError(error.message || "Unable to stop recording.");
        }
    };

    /*
     * =====================================================
     * SAVE TEST RECORDING
     * =====================================================
     *
     * Пока только development.
     *
     * Позже вместо этого:
     *
     * POST Laravel API
     */

    const saveRecording = () => {
        if (!recordingUrl) {
            return;
        }

        const link = document.createElement("a");

        link.href = recordingUrl;

        link.download = `interview-test-${Date.now()}.webm`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);
    };

    /*
     * =====================================================
     * CLEANUP
     * =====================================================
     */

    useEffect(() => {
        return () => {
            if (recordingUrl) {
                URL.revokeObjectURL(recordingUrl);
            }
        };
    }, [recordingUrl]);

    /*
     * =====================================================
     * UI
     * =====================================================
     */

    return (
        <div
            className="
                min-h-screen
                p-[40px]
                font-chakra
            "
        >
            <h1
                className="
                    text-3xl
                    font-semibold
                    mb-[15px]
                "
            >
                Interview Recording Test
            </h1>

            <p
                className="
                    mb-[30px]
                "
            >
                This test records all monitors, webcam and microphone into one WebM
                file.
            </p>

            {error && (
                <div
                    className="
                        border-2
                        border-red-500
                        p-[15px]
                        mb-[25px]
                    "
                >
                    {error}
                </div>
            )}

            {/*
                =============================================
                START
                =============================================
            */}

            {!isRecording && (
                <button
                    onClick={startRecording}
                    className="
                        border-2
                        px-[25px]
                        py-[10px]
                        cursor-pointer
                        mb-[30px]
                    "
                >
                    Start Recording
                </button>
            )}

            {/*
                =============================================
                RECORDING
                =============================================
            */}

            {isRecording && (
                <>
                    <div
                        className="
                            border-2
                            p-[15px]
                            max-w-[1200px]
                            mb-[20px]
                        "
                    >
                        <p>
                            Recording: <b>ON</b>
                        </p>

                        <p>
                            Monitors detected: <b>{monitorCount}</b>
                        </p>
                    </div>

                    <button
                        onClick={stopRecording}
                        className="
                            border-2
                            px-[25px]
                            py-[10px]
                            cursor-pointer
                            mb-[30px]
                        "
                    >
                        Stop Recording
                    </button>

                    {/*
                        =====================================
                        LIVE FINAL PREVIEW
                        =====================================
                    */}

                    <div
                        className="
                            border-2
                            p-[20px]
                            max-w-[1200px]
                            mb-[30px]
                        "
                    >
                        <h2
                            className="
                                font-semibold
                                text-xl
                                mb-[10px]
                            "
                        >
                            Live Final Preview
                        </h2>

                        <p
                            className="
                                text-sm
                                text-gray-500
                                mb-[15px]
                            "
                        >
                            All monitors + webcam overlay. Microphone audio is muted in live
                            preview to prevent echo.
                        </p>

                        <video
                            ref={previewRef}
                            autoPlay
                            muted
                            playsInline
                            className="
                                bg-black
                                w-full
                                aspect-video
                            "
                        />
                    </div>
                </>
            )}

            {/*
                =============================================
                RECORDED RESULT
                =============================================
            */}

            {recordingUrl && (
                <div
                    className="
                        border-2
                        p-[20px]
                        max-w-[1200px]
                    "
                >
                    <h2
                        className="
                            font-semibold
                            text-xl
                            mb-[10px]
                        "
                    >
                        Recorded Video
                    </h2>

                    <p
                        className="
                            mb-[15px]
                        "
                    >
                        Size: <b>{(recordingSize / 1024 / 1024).toFixed(2)} MB</b>
                    </p>

                    <video
                        src={recordingUrl}
                        controls
                        playsInline
                        className="
                            bg-black
                            w-full
                            aspect-video
                            mb-[20px]
                        "
                    />

                    <button
                        onClick={saveRecording}
                        className="
                            border-2
                            px-[25px]
                            py-[10px]
                            cursor-pointer
                        "
                    >
                        Save Test Recording
                    </button>
                </div>
            )}
        </div>
    );
}

export default InterviewRecordingTest;
