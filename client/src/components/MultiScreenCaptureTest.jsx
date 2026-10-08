import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    startMultiScreenCapture,
    stopMultiScreenCapture,
} from "../services/recording/multiScreenCapture";


function MultiScreenCaptureTest() {

    const previewRef =
        useRef(null);


    const [
        isCapturing,
        setIsCapturing,
    ] = useState(false);


    const [
        monitorCount,
        setMonitorCount,
    ] = useState(0);


    const [
        error,
        setError,
    ] = useState("");


    const startCapture =
        async () => {

            try {

                setError("");


                const result =
                    await startMultiScreenCapture();


                setMonitorCount(
                    result.monitorCount
                );


                if (
                    previewRef.current
                ) {

                    previewRef.current.srcObject =
                        result.stream;


                    await previewRef.current
                        .play();
                }


                setIsCapturing(
                    true
                );


            } catch (error) {

                console.error(
                    "Multi-screen capture failed:",
                    error
                );


                setError(
                    error.message ||
                    "Unable to capture displays."
                );
            }
        };


    const stopCapture =
        () => {

            stopMultiScreenCapture();


            if (
                previewRef.current
            ) {

                previewRef.current.srcObject =
                    null;
            }


            setIsCapturing(
                false
            );


            setMonitorCount(
                0
            );
        };


    useEffect(() => {

        return () => {

            stopMultiScreenCapture();

        };

    }, []);


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
                    mb-[20px]
                "
            >
                Multi Monitor Capture Test
            </h1>


            <p
                className="
                    mb-[25px]
                "
            >
                All connected monitors
                will be captured automatically.
            </p>


            {error && (

                <div
                    className="
                        border-2
                        border-red-500
                        p-[15px]
                        mb-[20px]
                    "
                >
                    {error}
                </div>

            )}


            {!isCapturing && (

                <button
                    onClick={
                        startCapture
                    }

                    className="
                        border-2
                        px-[25px]
                        py-[10px]
                        cursor-pointer
                        mb-[30px]
                    "
                >
                    Start Multi Screen Test
                </button>

            )}


            {isCapturing && (

                <>

                    <div
                        className="
                            mb-[20px]
                        "
                    >

                        <p>
                            Capturing:
                            {" "}
                            <b>
                                {
                                    monitorCount
                                }
                            </b>
                            {" "}
                            monitor(s)
                        </p>

                    </div>


                    <button
                        onClick={
                            stopCapture
                        }

                        className="
                            border-2
                            px-[25px]
                            py-[10px]
                            cursor-pointer
                            mb-[30px]
                        "
                    >
                        Stop Capture
                    </button>

                </>

            )}


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
                    Combined Preview
                </h2>


                <video
                    ref={
                        previewRef
                    }

                    autoPlay

                    muted

                    playsInline

                    className="
                        bg-black
                        w-full
                        max-w-[1200px]
                        aspect-video
                    "
                />

            </div>

        </div>
    );
}


export default MultiScreenCaptureTest;