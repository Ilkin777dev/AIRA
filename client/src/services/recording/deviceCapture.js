/*
 * =========================================================
 * DEVICE CAPTURE SERVICE
 * =========================================================
 *
 * Управляет:
 *
 * - Camera
 * - Microphone
 *
 * Позже этот stream подключим
 * к Interview Recorder.
 */


let deviceStream = null;


/*
 * =========================================================
 * START
 * =========================================================
 */

export const startDeviceCapture =
    async () => {

        /*
         * Не разрешаем запустить
         * второй stream поверх первого.
         */
        if (deviceStream) {

            throw new Error(
                "Camera and microphone are already active."
            );
        }


        /*
         * Проверяем поддержку API.
         */
        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices
                .getUserMedia
        ) {

            throw new Error(
                "Media devices API is not available."
            );
        }


        try {

            /*
             * Запрашиваем одновременно:
             *
             * Webcam
             * +
             * Microphone
             */
            deviceStream =
                await navigator
                    .mediaDevices
                    .getUserMedia({

                        /*
                         * CAMERA
                         */
                        video: {

                            width: {
                                ideal: 1280,
                            },

                            height: {
                                ideal: 720,
                            },

                            frameRate: {
                                ideal: 30,
                                max: 30,
                            },

                        },


                        /*
                         * MICROPHONE
                         */
                        audio: {

                            echoCancellation:
                                true,

                            noiseSuppression:
                                true,

                            autoGainControl:
                                true,

                        },

                    });


            /*
             * Получаем camera track.
             */
            const videoTrack =
                deviceStream
                    .getVideoTracks()[0];


            /*
             * Получаем microphone track.
             */
            const audioTrack =
                deviceStream
                    .getAudioTracks()[0];


            /*
             * Camera обязательна.
             */
            if (!videoTrack) {

                throw new Error(
                    "Camera was not detected."
                );
            }


            /*
             * Microphone обязателен.
             */
            if (!audioTrack) {

                throw new Error(
                    "Microphone was not detected."
                );
            }


            console.log(
                "Camera:",
                videoTrack.label
            );


            console.log(
                "Microphone:",
                audioTrack.label
            );


            /*
             * Возвращаем всё,
             * что понадобится UI.
             */
            return {

                stream:
                    deviceStream,


                cameraTrack:
                    videoTrack,


                microphoneTrack:
                    audioTrack,


                cameraLabel:
                    videoTrack.label ||
                    "Camera",


                microphoneLabel:
                    audioTrack.label ||
                    "Microphone",

            };


        } catch (error) {

            /*
             * Если например камера
             * открылась, а микрофон нет —
             *
             * обязательно закрываем
             * уже полученные devices.
             */
            stopDeviceCapture();


            throw error;
        }
    };


/*
 * =========================================================
 * STOP
 * =========================================================
 */

export const stopDeviceCapture =
    () => {

        if (!deviceStream) {

            return;
        }


        /*
         * Останавливаем ВСЕ tracks.
         *
         * То есть:
         *
         * camera OFF
         * microphone OFF
         */
        deviceStream
            .getTracks()
            .forEach(
                (track) => {

                    track.stop();

                }
            );


        deviceStream = null;


        console.log(
            "Camera and microphone stopped."
        );
    };


/*
 * =========================================================
 * GET CURRENT STREAM
 * =========================================================
 */

export const getDeviceStream =
    () => {

        return deviceStream;
    };