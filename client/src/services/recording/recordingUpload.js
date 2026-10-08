import api
    from "../../api/axios.js";


/*
 * =========================================================
 * UPLOAD INTERVIEW RECORDING
 * =========================================================
 *
 * Candidate ничего не выбирает.
 *
 * Blob автоматически отправляется
 * Laravel backend.
 */

export const uploadInterviewRecording =
    async ({
        interviewId,
        blob,
        durationSeconds = null,
    }) => {

        if (!interviewId) {
            throw new Error(
                "Interview ID is required."
            );
        }


        if (!blob) {
            throw new Error(
                "Recording Blob is required."
            );
        }


        const formData =
            new FormData();


        /*
         * Имя здесь техническое.
         *
         * Laravel всё равно создаст
         * собственное уникальное имя.
         */
        formData.append(
            "recording",
            blob,
            "interview.webm"
        );


        if (
            durationSeconds !== null
        ) {
            formData.append(
                "duration_seconds",
                String(durationSeconds)
            );
        }


        const response =
            await api.post(
                `/api/interviews/${interviewId}/recording`,
                formData,
                {
                    headers: {
                        Accept:
                            "application/json",
                    },
                }
            );


        return response.data;
    };