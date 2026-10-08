import {
    useEffect,
    useRef,
    useState,
} from "react";


function ScreenCaptureTest() {

    const videoRef =
        useRef(null);

    const streamRef =
        useRef(null);


    const [
        screens,
        setScreens,
    ] = useState([]);


    const [
        selectedScreen,
        setSelectedScreen,
    ] = useState(null);


    const [
        isSharing,
        setIsSharing,
    ] = useState(false);


    const [
        error,
        setError,
    ] = useState("");


    /*
     * Загружаем список мониторов
     * при открытии страницы.
     */
    useEffect(() => {

        loadScreens();

    }, []);


    /*
     * Когда video появился в DOM,
     * подключаем MediaStream.
     */
    useEffect(() => {

        if (
            isSharing &&
            videoRef.current &&
            streamRef.current
        ) {

            videoRef.current.srcObject =
                streamRef.current;


            videoRef.current
                .play()
                .catch((error) => {

                    console.error(
                        "Video play error:",
                        error
                    );

                });

        }

    }, [isSharing]);


    const loadScreens =
        async () => {

            try {

                setError("");


                if (
                    !window.electronAPI
                        ?.getScreenSources
                ) {

                    throw new Error(
                        "Screen capture is available only in Electron."
                    );

                }


                const result =
                    await window
                        .electronAPI
                        .getScreenSources();


                console.log(
                    "Screens:",
                    result
                );


                setScreens(
                    result
                );


                /*
                 * Автоматически выбираем
                 * первый монитор.
                 */
                if (
                    result.length > 0
                ) {

                    setSelectedScreen(
                        result[0].id
                    );

                }

            } catch (error) {

                console.error(
                    error
                );


                setError(
                    error.message
                );

            }
        };


    const startScreenCapture =
        async () => {

            try {

                setError("");


                if (
                    !selectedScreen
                ) {

                    setError(
                        "Please select a screen."
                    );

                    return;
                }


                /*
                 * Сначала говорим Electron,
                 * какой монитор выбран.
                 */
                await window
                    .electronAPI
                    .selectScreen(
                        selectedScreen
                    );


                /*
                 * Затем запрашиваем
                 * MediaStream.
                 */
                const stream =
                    await navigator
                        .mediaDevices
                        .getDisplayMedia({

                            video: {
                                frameRate: 30,
                            },

                            audio: false,

                        });


                console.log(
                    "Screen stream:",
                    stream
                );


                streamRef.current =
                    stream;


                setIsSharing(
                    true
                );


                const videoTrack =
                    stream
                        .getVideoTracks()[0];


                if (videoTrack) {

                    console.log(
                        "Captured track:",
                        videoTrack.label
                    );


                    videoTrack.onended =
                        () => {

                            stopScreenCapture();

                        };

                }

            } catch (error) {

                console.error(
                    "Screen capture failed:",
                    error
                );


                setError(
                    error.message ||
                    "Unable to capture screen."
                );

            }
        };


    const stopScreenCapture =
        () => {

            if (
                streamRef.current
            ) {

                streamRef.current
                    .getTracks()
                    .forEach(
                        (track) => {

                            track.stop();

                        }
                    );


                streamRef.current =
                    null;

            }


            if (
                videoRef.current
            ) {

                videoRef.current.srcObject =
                    null;

            }


            setIsSharing(
                false
            );


            console.log(
                "Screen capture stopped."
            );

        };


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
                    mb-[30px]
                "
            >
                Screen Capture Test
            </h1>


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


            {!isSharing && (

                <>
                    <h2
                        className="
                            text-xl
                            font-semibold
                            mb-[20px]
                        "
                    >
                        Select monitor
                    </h2>


                    <div
                        className="
                            grid
                            grid-cols-3
                            gap-[20px]
                            mb-[30px]
                        "
                    >

                        {screens.map(
                            (screen) => (

                                <div
                                    key={
                                        screen.id
                                    }

                                    onClick={() => {

                                        setSelectedScreen(
                                            screen.id
                                        );

                                    }}

                                    className={`
                                        border-2
                                        p-[10px]
                                        cursor-pointer

                                        ${
                                            selectedScreen ===
                                            screen.id
                                                ? "border-black bg-gray-200"
                                                : "border-gray-300"
                                        }
                                    `}
                                >

                                    <img
                                        src={
                                            screen.thumbnail
                                        }

                                        alt={
                                            screen.name
                                        }

                                        className="
                                            w-full
                                            mb-[10px]
                                        "
                                    />


                                    <p
                                        className="
                                            font-semibold
                                        "
                                    >
                                        {
                                            screen.name
                                        }
                                    </p>


                                    <p
                                        className="
                                            text-sm
                                            text-gray-500
                                        "
                                    >
                                        ID: {
                                            screen.displayId
                                        }
                                    </p>

                                </div>

                            )
                        )}

                    </div>


                    <button
                        onClick={
                            startScreenCapture
                        }

                        disabled={
                            !selectedScreen
                        }

                        className="
                            border-2
                            px-[25px]
                            py-[10px]
                            cursor-pointer
                        "
                    >
                        Start Screen Test
                    </button>

                </>

            )}


            {isSharing && (

                <>

                    <button
                        onClick={
                            stopScreenCapture
                        }

                        className="
                            border-2
                            px-[25px]
                            py-[10px]
                            cursor-pointer
                            mb-[25px]
                        "
                    >
                        Stop Screen Test
                    </button>


                    <div
                        className="
                            border-2
                            p-[20px]
                        "
                    >

                        <h2
                            className="
                                font-semibold
                                mb-[15px]
                            "
                        >
                            Live Screen Preview
                        </h2>


                        <video
                            ref={
                                videoRef
                            }

                            autoPlay

                            muted

                            playsInline

                            className="
                                w-full
                                max-w-[1100px]
                                border-2
                                bg-black
                            "
                        />

                    </div>

                </>

            )}

        </div>
    );
}


export default ScreenCaptureTest;