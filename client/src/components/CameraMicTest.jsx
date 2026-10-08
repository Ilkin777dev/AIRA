import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    startDeviceCapture,
    stopDeviceCapture,
} from "../services/recording/deviceCapture";


function CameraMicTest() {

    /*
     * =====================================================
     * REFS
     * =====================================================
     */

    const videoRef =
        useRef(null);


    const deviceStreamRef =
        useRef(null);


    const audioContextRef =
        useRef(null);


    const analyserRef =
        useRef(null);


    const animationFrameRef =
        useRef(null);


    /*
     * =====================================================
     * STATE
     * =====================================================
     */

    const [
        isRunning,
        setIsRunning,
    ] = useState(false);


    const [
        microphoneLevel,
        setMicrophoneLevel,
    ] = useState(0);


    const [
        cameraName,
        setCameraName,
    ] = useState("");


    const [
        microphoneName,
        setMicrophoneName,
    ] = useState("");


    const [
        error,
        setError,
    ] = useState("");


    /*
     * =====================================================
     * CAMERA PREVIEW
     * =====================================================
     *
     * Когда React уже создал <video>,
     * только тогда подключаем MediaStream.
     *
     * Это сделано специально,
     * чтобы не повторить нашу прошлую
     * проблему с белым preview.
     */

    useEffect(
        () => {

            const attachStream =
                async () => {

                    if (
                        !isRunning ||
                        !videoRef.current ||
                        !deviceStreamRef.current
                    ) {

                        return;
                    }


                    try {

                        videoRef.current
                            .srcObject =
                            deviceStreamRef.current;


                        await videoRef.current
                            .play();


                    } catch (error) {

                        console.error(
                            "Camera preview error:",
                            error
                        );
                    }
                };


            attachStream();

        },
        [isRunning]
    );


    /*
     * =====================================================
     * MICROPHONE METER
     * =====================================================
     */

    const startMicrophoneMeter =
        async (stream) => {

            const AudioContextClass =
                window.AudioContext ||
                window.webkitAudioContext;


            if (!AudioContextClass) {

                throw new Error(
                    "Web Audio API is not available."
                );
            }


            /*
             * Создаём AudioContext.
             */
            const audioContext =
                new AudioContextClass();


            /*
             * Некоторые Chromium версии
             * создают context suspended.
             */
            if (
                audioContext.state ===
                "suspended"
            ) {

                await audioContext.resume();
            }


            /*
             * Analyser нужен только
             * чтобы видеть уровень голоса.
             */
            const analyser =
                audioContext
                    .createAnalyser();


            analyser.fftSize =
                256;


            analyser.smoothingTimeConstant =
                0.8;


            /*
             * Берём только audio track.
             */
            const audioOnlyStream =
                new MediaStream(
                    stream.getAudioTracks()
                );


            const source =
                audioContext
                    .createMediaStreamSource(
                        audioOnlyStream
                    );


            source.connect(
                analyser
            );


            audioContextRef.current =
                audioContext;


            analyserRef.current =
                analyser;


            /*
             * Здесь analyser пишет
             * frequency information.
             */
            const dataArray =
                new Uint8Array(
                    analyser
                        .frequencyBinCount
                );


            /*
             * =================================================
             * LIVE MICROPHONE LEVEL
             * =================================================
             */

            const updateMicrophoneLevel =
                () => {

                    /*
                     * Если analyser уже уничтожен,
                     * прекращаем цикл.
                     */
                    if (
                        !analyserRef.current
                    ) {

                        return;
                    }


                    analyser
                        .getByteFrequencyData(
                            dataArray
                        );


                    let total = 0;


                    for (
                        let i = 0;
                        i <
                        dataArray.length;
                        i++
                    ) {

                        total +=
                            dataArray[i];
                    }


                    const average =
                        total /
                        dataArray.length;


                    /*
                     * Превращаем уровень
                     * примерно в диапазон 0-100.
                     *
                     * Это не профессиональный
                     * dB meter.
                     *
                     * Нам сейчас важно только
                     * увидеть, что микрофон работает.
                     */
                    const normalized =
                        Math.min(
                            100,
                            Math.round(
                                average *
                                1.5
                            )
                        );


                    setMicrophoneLevel(
                        normalized
                    );


                    animationFrameRef.current =
                        requestAnimationFrame(
                            updateMicrophoneLevel
                        );
                };


            updateMicrophoneLevel();
        };


    /*
     * =====================================================
     * STOP MICROPHONE METER
     * =====================================================
     */

    const stopMicrophoneMeter =
        async () => {

            /*
             * Останавливаем
             * requestAnimationFrame loop.
             */
            if (
                animationFrameRef.current
            ) {

                cancelAnimationFrame(
                    animationFrameRef.current
                );


                animationFrameRef.current =
                    null;
            }


            analyserRef.current =
                null;


            /*
             * Закрываем AudioContext.
             */
            if (
                audioContextRef.current
            ) {

                try {

                    await audioContextRef.current
                        .close();

                } catch (error) {

                    console.error(
                        "AudioContext close error:",
                        error
                    );
                }


                audioContextRef.current =
                    null;
            }


            setMicrophoneLevel(
                0
            );
        };


    /*
     * =====================================================
     * START TEST
     * =====================================================
     */

    const startTest =
        async () => {

            try {

                setError("");


                /*
                 * Получаем webcam
                 * + microphone.
                 */
                const result =
                    await startDeviceCapture();


                /*
                 * Сохраняем stream.
                 */
                deviceStreamRef.current =
                    result.stream;


                /*
                 * Показываем названия устройств.
                 */
                setCameraName(
                    result.cameraLabel
                );


                setMicrophoneName(
                    result.microphoneLabel
                );


                /*
                 * Запускаем microphone meter.
                 */
                await startMicrophoneMeter(
                    result.stream
                );


                /*
                 * После этого React создаст
                 * <video>.
                 *
                 * useEffect подключит stream.
                 */
                setIsRunning(
                    true
                );


            } catch (error) {

                console.error(
                    "Device test error:",
                    error
                );


                /*
                 * На всякий случай
                 * освобождаем устройства.
                 */
                stopDeviceCapture();


                deviceStreamRef.current =
                    null;


                setIsRunning(
                    false
                );


                setError(
                    error.message ||
                    "Unable to access camera or microphone."
                );
            }
        };


    /*
     * =====================================================
     * STOP TEST
     * =====================================================
     */

    const stopTest =
        async () => {

            /*
             * Сначала отключаем
             * camera + microphone.
             */
            stopDeviceCapture();


            deviceStreamRef.current =
                null;


            /*
             * Останавливаем meter.
             */
            await stopMicrophoneMeter();


            /*
             * Удаляем stream из video.
             */
            if (
                videoRef.current
            ) {

                videoRef.current
                    .srcObject =
                    null;
            }


            setCameraName(
                ""
            );


            setMicrophoneName(
                ""
            );


            setIsRunning(
                false
            );


            console.log(
                "Device test stopped."
            );
        };


    /*
     * =====================================================
     * COMPONENT CLEANUP
     * =====================================================
     *
     * Если пользователь уйдёт
     * со страницы —
     * камера и микрофон
     * всё равно выключатся.
     */

    useEffect(
        () => {

            return () => {

                stopDeviceCapture();


                if (
                    animationFrameRef.current
                ) {

                    cancelAnimationFrame(
                        animationFrameRef.current
                    );
                }


                analyserRef.current =
                    null;


                if (
                    audioContextRef.current
                ) {

                    audioContextRef.current
                        .close()
                        .catch(
                            () => {}
                        );
                }

            };

        },
        []
    );


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
                Camera & Microphone Test
            </h1>


            <p
                className="
                    mb-[30px]
                "
            >
                Test camera and microphone
                before the interview.
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


            {!isRunning && (

                <button
                    onClick={
                        startTest
                    }

                    className="
                        border-2
                        px-[25px]
                        py-[10px]
                        cursor-pointer
                    "
                >
                    Start Device Test
                </button>

            )}


            {isRunning && (

                <>

                    {/*
                        =====================================
                        DEVICE INFORMATION
                        =====================================
                    */}

                    <div
                        className="
                            border-2
                            p-[15px]
                            max-w-[700px]
                            mb-[20px]
                        "
                    >

                        <p
                            className="
                                mb-[5px]
                            "
                        >
                            Camera:
                            {" "}

                            <b>
                                {
                                    cameraName
                                }
                            </b>
                        </p>


                        <p>
                            Microphone:
                            {" "}

                            <b>
                                {
                                    microphoneName
                                }
                            </b>
                        </p>

                    </div>


                    {/*
                        =====================================
                        CAMERA PREVIEW
                        =====================================
                    */}

                    <div
                        className="
                            max-w-[700px]
                            mb-[25px]
                        "
                    >

                        <h2
                            className="
                                font-semibold
                                mb-[10px]
                            "
                        >
                            Camera Preview
                        </h2>


                        <video
                            ref={
                                videoRef
                            }

                            autoPlay

                            muted

                            playsInline

                            className="
                                bg-black
                                w-full
                                aspect-video
                                border-2
                            "
                        />

                    </div>


                    {/*
                        =====================================
                        MICROPHONE
                        =====================================
                    */}

                    <div
                        className="
                            max-w-[700px]
                            mb-[30px]
                        "
                    >

                        <h2
                            className="
                                font-semibold
                                mb-[10px]
                            "
                        >
                            Microphone Level
                        </h2>


                        <div
                            className="
                                w-full
                                h-[25px]
                                border-2
                                overflow-hidden
                            "
                        >

                            <div
                                style={{
                                    width:
                                        `${microphoneLevel}%`,
                                }}

                                className="
                                    h-full
                                    bg-black
                                "
                            />

                        </div>


                        <p
                            className="
                                mt-[8px]
                            "
                        >
                            Level:
                            {" "}

                            <b>
                                {
                                    microphoneLevel
                                }%
                            </b>
                        </p>


                        <p
                            className="
                                mt-[5px]
                                text-sm
                                text-gray-500
                            "
                        >
                            Speak into your microphone.
                            The level should move.
                        </p>

                    </div>


                    {/*
                        =====================================
                        STOP
                        =====================================
                    */}

                    <button
                        onClick={
                            stopTest
                        }

                        className="
                            border-2
                            px-[25px]
                            py-[10px]
                            cursor-pointer
                        "
                    >
                        Stop Device Test
                    </button>

                </>

            )}

        </div>
    );
}


export default CameraMicTest;