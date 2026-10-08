import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
} from "react-router-dom";

import api from "../api/axios";

import useInterviewProctoring from "../services/proctoring/useInterviewProctoring.js";

import {
  isInterviewRecording,
  startInterviewRecording,
  stopInterviewRecording,
} from "../services/recording/interviewRecorder.js";

// Images
import bgImage from "../assets/main_bg.png";
import Logo from "../assets/AI_Recruiter_Logo.png";
import AIRA_Logo_White from "../assets/AIRA-Logo-White.png";


function Interview() {
  const location =
    useLocation();

  const interview =
    location.state?.interview;


  /*
  |--------------------------------------------------------------------------
  | INTERVIEW DATA
  |--------------------------------------------------------------------------
  */

  const [
    questions,
    setQuestions,
  ] = useState([]);

  const [
    currentQuestionIndex,
    setCurrentQuestionIndex,
  ] = useState(0);

  const [
    answer,
    setAnswer,
  ] = useState("");


  /*
  |--------------------------------------------------------------------------
  | USER
  |--------------------------------------------------------------------------
  */

  const [
    user,
    setUser,
  ] = useState(null);


  /*
  |--------------------------------------------------------------------------
  | INTERVIEW STATE
  |--------------------------------------------------------------------------
  */

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isCompleted,
    setIsCompleted,
  ] = useState(false);

  const [
    isFinishing,
    setIsFinishing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /*
|--------------------------------------------------------------------------
| AIRA PROCTORING
|--------------------------------------------------------------------------
*/

useInterviewProctoring(
  interview?.id,
  Boolean(
    interview?.id
  ) &&
  !isCompleted
);

  /*
  |--------------------------------------------------------------------------
  | TIMER
  |--------------------------------------------------------------------------
  */

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(null);

  const timerRef =
    useRef(null);


  /*
  |--------------------------------------------------------------------------
  | RECORDING
  |--------------------------------------------------------------------------
  */

  const [
    isRecordingReady,
    setIsRecordingReady,
  ] = useState(false);

  const [
    recordingError,
    setRecordingError,
  ] = useState("");

  const recordingStartRef =
    useRef(false);

  const recordingStopPromiseRef =
    useRef(null);


  /*
  |--------------------------------------------------------------------------
  | FINISH PROTECTION
  |--------------------------------------------------------------------------
  */

  const finishStartedRef =
    useRef(false);


  /*
  |--------------------------------------------------------------------------
  | CURRENT QUESTION
  |--------------------------------------------------------------------------
  */

  const currentQuestion =
    questions[currentQuestionIndex] ||
    null;


  /*
  |--------------------------------------------------------------------------
  | ANSWERED COUNT
  |--------------------------------------------------------------------------
  */

  const answeredCount =
    questions.filter(
      question =>
        question.answered
    ).length;


  /*
  |--------------------------------------------------------------------------
  | ANSWER PROGRESS
  |--------------------------------------------------------------------------
  |
  | Прогресс зависит только от количества
  | отвеченных вопросов.
  |
  | 0 / 10  = 0%
  | 4 / 10  = 40%
  | 10 / 10 = 100%
  |
  */

  const progressPercent =
    questions.length > 0
      ? Math.round(
          (
            answeredCount /
            questions.length
          ) * 100
        )
      : 0;


  /*
  |--------------------------------------------------------------------------
  | LOAD USER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadUser =
      async () => {

        try {

          const response =
            await api.get(
              "/api/me"
            );

          setUser(
            response.data.user
          );

        } catch (
          requestError
        ) {

          console.error(
            "LOAD USER ERROR:",
            requestError
          );
        }
      };


    loadUser();

  }, []);


  /*
  |--------------------------------------------------------------------------
  | LOAD QUESTIONS
  |--------------------------------------------------------------------------
  */

  const loadQuestions =
    useCallback(
      async () => {

        if (
          !interview?.id
        ) {

          setError(
            "Interview data not found."
          );

          setIsLoading(false);

          return;
        }


        try {

          setError("");


          const response =
            await api.get(
              `/api/interviews/${interview.id}/questions`
            );


          const loadedQuestions =
            response.data
              .questions ||
            [];


          setQuestions(
            loadedQuestions
          );


          setRemainingSeconds(
            response.data
              .remaining_seconds ??
            0
          );


          /*
          |--------------------------------------------------------------------------
          | INTERVIEW EXPIRED
          |--------------------------------------------------------------------------
          */

          if (
            response.data
              .interview_expired
          ) {

            setRemainingSeconds(
              0
            );
          }


          /*
          |--------------------------------------------------------------------------
          | FIRST UNANSWERED QUESTION
          |--------------------------------------------------------------------------
          */

          const firstUnansweredIndex =
            loadedQuestions.findIndex(
              question =>
                !question.answered
            );


          if (
            firstUnansweredIndex !==
            -1
          ) {

            setCurrentQuestionIndex(
              firstUnansweredIndex
            );

          } else {

            setCurrentQuestionIndex(
              0
            );
          }

        } catch (
          requestError
        ) {

          console.error(
            "LOAD QUESTIONS ERROR:",
            requestError
          );


          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            "Failed to load interview questions."
          );

        } finally {

          setIsLoading(false);
        }
      },
      [
        interview?.id,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    loadQuestions();

  }, [
    loadQuestions,
  ]);


  /*
  |--------------------------------------------------------------------------
  | RESTORE CURRENT ANSWER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    if (
      !currentQuestion
    ) {

      setAnswer("");

      return;
    }


    setAnswer(
      currentQuestion.answer ||
      ""
    );

  }, [
    currentQuestion,
  ]);


  /*
  |--------------------------------------------------------------------------
  | START RECORDING
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    if (
      !interview?.id
    ) {
      return;
    }


    if (
      recordingStartRef.current
    ) {
      return;
    }


    recordingStartRef.current =
      true;


    const prepareRecording =
      async () => {

        try {

          setRecordingError("");


          /*
          |--------------------------------------------------------------------------
          | ALREADY RECORDING
          |--------------------------------------------------------------------------
          */

          if (
            isInterviewRecording()
          ) {

            setIsRecordingReady(
              true
            );

            return;
          }


          await startInterviewRecording(
            interview.id
          );


          setIsRecordingReady(
            true
          );


          console.log(
            "INTERVIEW RECORDING STARTED"
          );

        } catch (
          requestError
        ) {

          console.error(
            "RECORDING START ERROR:",
            requestError
          );


          setRecordingError(
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError.message ||
            "Failed to start interview recording."
          );


          setIsRecordingReady(
            false
          );
        }
      };


    prepareRecording();

  }, [
    interview?.id,
  ]);


  /*
  |--------------------------------------------------------------------------
  | STOP RECORDING
  |--------------------------------------------------------------------------
  */

  const finalizeRecording =
    useCallback(
      async () => {

        if (
          !isInterviewRecording()
        ) {

          return null;
        }


        if (
          recordingStopPromiseRef.current
        ) {

          return (
            recordingStopPromiseRef.current
          );
        }


        recordingStopPromiseRef.current =
          stopInterviewRecording();


        try {

          const result =
            await recordingStopPromiseRef.current;


          setIsRecordingReady(
            false
          );


          return result;

        } finally {

          recordingStopPromiseRef.current =
            null;
        }
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | FINISH INTERVIEW
  |--------------------------------------------------------------------------
  */

  const finishInterview =
    useCallback(
      async (
        reason =
          "manual"
      ) => {

        if (
          !interview?.id
        ) {
          return;
        }


        if (
          finishStartedRef.current
        ) {

          return;
        }


        finishStartedRef.current =
          true;


        try {

          setIsFinishing(
            true
          );

          setError("");


          const response =
            await api.post(
              `/api/interviews/${interview.id}/finish`
            );


          console.log(
            "INTERVIEW FINISHED:",
            reason,
            response.data
          );


          /*
          |--------------------------------------------------------------------------
          | FINALIZE VIDEO RECORDING
          |--------------------------------------------------------------------------
          */

          try {

            await finalizeRecording();

          } catch (
            recordingFinishError
          ) {

            console.error(
              "RECORDING FINALIZE ERROR:",
              recordingFinishError
            );


            setRecordingError(
              recordingFinishError
                ?.response
                ?.data
                ?.message ||
              recordingFinishError
                .message ||
              "Interview completed, but recording finalization failed."
            );
          }


          setRemainingSeconds(
            0
          );

          setIsCompleted(
            true
          );


          if (
            timerRef.current
          ) {

            clearInterval(
              timerRef.current
            );

            timerRef.current =
              null;
          }

        } catch (
          requestError
        ) {

          console.error(
            "FINISH INTERVIEW ERROR:",
            requestError
          );


          if (
            requestError
              ?.response
              ?.status ===
            409
          ) {

            try {

              await finalizeRecording();

            } catch {
              // Recording error already handled.
            }


            setIsCompleted(
              true
            );

            return;
          }


          finishStartedRef.current =
            false;


          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            "Failed to finish interview."
          );

        } finally {

          setIsFinishing(
            false
          );
        }
      },
      [
        interview?.id,
        finalizeRecording,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | TIMER
  |--------------------------------------------------------------------------
  |
  | После получения remainingSeconds от backend
  | frontend самостоятельно уменьшает время
  | каждую секунду.
  |
  */

  const timerReady =
    remainingSeconds !== null;


  useEffect(() => {

    if (
      !timerReady ||
      isCompleted
    ) {

      return;
    }


    /*
    |--------------------------------------------------------------------------
    | REMOVE OLD INTERVAL
    |--------------------------------------------------------------------------
    */

    if (
      timerRef.current
    ) {

      clearInterval(
        timerRef.current
      );

      timerRef.current =
        null;
    }


    /*
    |--------------------------------------------------------------------------
    | START TIMER
    |--------------------------------------------------------------------------
    */

    timerRef.current =
      setInterval(
        () => {

          setRemainingSeconds(
            previous => {

              if (
                previous === null
              ) {

                return previous;
              }


              if (
                previous <= 1
              ) {

                clearInterval(
                  timerRef.current
                );

                timerRef.current =
                  null;

                return 0;
              }


              return (
                previous - 1
              );
            }
          );

        },
        1000
      );


    /*
    |--------------------------------------------------------------------------
    | CLEANUP
    |--------------------------------------------------------------------------
    */

    return () => {

      if (
        timerRef.current
      ) {

        clearInterval(
          timerRef.current
        );

        timerRef.current =
          null;
      }
    };

  }, [
    timerReady,
    isCompleted,
  ]);


  /*
  |--------------------------------------------------------------------------
  | AUTO FINISH WHEN TIMER = 0
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    if (
      remainingSeconds !==
        0 ||
      isCompleted
    ) {

      return;
    }


    finishInterview(
      "timeout"
    );

  }, [
    remainingSeconds,
    isCompleted,
    finishInterview,
  ]);


  /*
  |--------------------------------------------------------------------------
  | FORMAT TIMER
  |--------------------------------------------------------------------------
  */

  const formatTimer = (
    seconds
  ) => {

    if (
      seconds === null
    ) {

      return "--:--";
    }


    const safeSeconds =
      Math.max(
        0,
        seconds
      );


    const minutes =
      Math.floor(
        safeSeconds /
        60
      );


    const remaining =
      safeSeconds %
      60;


    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remaining).padStart(
      2,
      "0"
    )}`;
  };


  /*
  |--------------------------------------------------------------------------
  | CHANGE QUESTION
  |--------------------------------------------------------------------------
  */

  const handleQuestionNavigation = (
    index
  ) => {

    if (
      isSubmitting ||
      isFinishing
    ) {

      return;
    }


    setError("");


    setCurrentQuestionIndex(
      index
    );
  };


  /*
  |--------------------------------------------------------------------------
  | SAVE / UPDATE ANSWER
  |--------------------------------------------------------------------------
  */

  const handleSubmitAnswer =
    async event => {

      event.preventDefault();


      if (
        !currentQuestion
      ) {

        return;
      }


      if (
        !answer.trim()
      ) {

        setError(
          "Cavabı seçin və ya daxil edin."
        );

        return;
      }


      if (
        remainingSeconds <=
        0
      ) {

        return;
      }


      try {

        setIsSubmitting(
          true
        );

        setError("");


        const response =
          await api.post(
            `/api/questions/${currentQuestion.id}/answer`,
            {
              answer,
            }
          );


        console.log(
          "ANSWER SAVED:",
          response.data
        );


        setQuestions(
          previous =>
            previous.map(
              (
                question,
                index
              ) => {

                if (
                  index !==
                  currentQuestionIndex
                ) {

                  return question;
                }


                return {
                  ...question,

                  answer:
                    response.data
                      .answer
                      ?.answer ??
                    answer,

                  answered:
                    true,
                };
              }
            )
        );


        /*
        |--------------------------------------------------------------------------
        | BACKEND TIMER SYNC
        |--------------------------------------------------------------------------
        */

        if (
          response.data
            .remaining_seconds !==
          undefined
        ) {

          setRemainingSeconds(
            response.data
              .remaining_seconds
          );
        }


        /*
        |--------------------------------------------------------------------------
        | NEXT QUESTION
        |--------------------------------------------------------------------------
        */

        if (
          currentQuestionIndex <
          questions.length -
            1
        ) {

          setCurrentQuestionIndex(
            previous =>
              previous +
              1
          );
        }

      } catch (
        requestError
      ) {

        console.error(
          "ANSWER ERROR:",
          requestError
        );


        if (
          requestError
            ?.response
            ?.data
            ?.interview_expired
        ) {

          setRemainingSeconds(
            0
          );

          return;
        }


        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          "Failed to save answer."
        );

      } finally {

        setIsSubmitting(
          false
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | MANUAL FINISH
  |--------------------------------------------------------------------------
  */

  const handleManualFinish =
    async () => {

      if (
        isFinishing
      ) {

        return;
      }


      const confirmed =
        window.confirm(
          `Siz ${questions.length} sualdan ${answeredCount} sualı cavablandırmısınız. İmtahanı bitirmək istədiyinizə əminsiniz?`
        );


      if (
        !confirmed
      ) {

        return;
      }


      await finishInterview(
        "manual"
      );
    };


  /*
  |--------------------------------------------------------------------------
  | USER FULL NAME
  |--------------------------------------------------------------------------
  */

  const candidate =
    user
      ?.candidate_profile;


  const candidateName = [
    candidate?.name,
    candidate?.surname,
  ]
    .filter(Boolean)
    .join(" ");


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (
    isLoading
  ) {

    return (
      <PageBackground>

        <div
          className="
            interview-loading
            flex
            min-h-screen
            items-center
            justify-center
          "
        >

          <div
            className="
              interview-loading-card
              rounded-[6px]
              bg-white
              px-[60px]
              py-[45px]
              text-center
            "
          >

            <LoadingSpinner />

            <h1
              className="
                interview-loading-title
                mt-[20px]
                font-chakra
                text-[28px]
                font-medium
                text-[#33375B]
              "
            >
              İmtahan hazırlanır
            </h1>

            <p
              className="
                interview-loading-text
                mt-[8px]
                text-[13px]
                text-[#777780]
              "
            >
              Suallar yüklənir...
            </p>

          </div>

        </div>

      </PageBackground>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | COMPLETED
  |--------------------------------------------------------------------------
  */

  if (
    isCompleted
  ) {

    return (
      <PageBackground>

        <div
          className="
            interview-completed
            flex
            min-h-screen
            items-center
            justify-center
            px-[20px]
          "
        >

          <div
            className="
              interview-completed-card
              w-full
              max-w-[520px]
              rounded-[6px]
              bg-white
              px-[45px]
              py-[50px]
              text-center
            "
          >

            <div
              className="
                interview-completed-icon
                mx-auto
                flex
                h-[58px]
                w-[58px]
                items-center
                justify-center
                rounded-full
                bg-[#33375B]
                text-white
              "
            >
              <CheckIcon />
            </div>


            <h1
              className="
                interview-completed-title
                mt-[24px]
                font-chakra
                text-[32px]
                font-medium
                text-[#33375B]
              "
            >
              İmtahan tamamlandı
            </h1>


            <p
              className="
                interview-completed-text
                mt-[10px]
                text-[14px]
                leading-[1.6]
                text-[#73737D]
              "
            >
              Təşəkkür edirik. Cavablarınız uğurla göndərildi.
            </p>


            {recordingError && (

              <p
                className="
                  interview-recording-error
                  mt-[25px]
                  rounded-[4px]
                  bg-[#FFF5F5]
                  px-[14px]
                  py-[10px]
                  text-[12px]
                  text-[#B24747]
                "
              >
                {recordingError}
              </p>

            )}

          </div>

        </div>

      </PageBackground>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | ERROR / NO QUESTIONS
  |--------------------------------------------------------------------------
  */

  if (
    !questions.length ||
    !currentQuestion
  ) {

    return (
      <PageBackground>

        <div
          className="
            interview-unavailable
            flex
            min-h-screen
            items-center
            justify-center
          "
        >

          <div
            className="
              interview-unavailable-card
              rounded-[6px]
              bg-white
              px-[50px]
              py-[40px]
              text-center
            "
          >

            <h1
              className="
                interview-unavailable-title
                font-chakra
                text-[28px]
                font-medium
                text-[#33375B]
              "
            >
              İmtahan əlçatan deyil
            </h1>

            <p
              className="
                interview-unavailable-error
                mt-[15px]
                text-[13px]
                text-[#B24747]
              "
            >
              {error ||
                "İmtahan sualları tapılmadı."}
            </p>

          </div>

        </div>

      </PageBackground>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | INTERVIEW UI
  |--------------------------------------------------------------------------
  */

  return (
    <main
      className="
        interview-page
        relative
        min-h-screen
        overflow-x-hidden
        bg-cover
        bg-center
        bg-fixed
        font-archivo
      "
      style={{
        backgroundImage:
          `url(${bgImage})`,
      }}
    >

      {/* HEADER */}

      <header
        className="
          interview-header
          relative
          z-20
          flex
          items-center
          justify-between
          px-[27px]
          pt-[24px]
        "
      >

        <div className="mb-[28px] flex items-center justify-center gap-[8px]">
          <img src={AIRA_Logo_White} alt="" className="w-[150px]" />
        </div>


        {/* TIMER */}

        <div
          className="
            interview-timer
            flex
            h-[38px]
            items-center
            gap-[7px]
            rounded-[5px]
            bg-white
            px-[12px]
            text-[#33375B]
          "
        >

          <ClockIcon />

          <span
            className="
              interview-timer-value
              text-[12px]
              font-medium
            "
          >
            {formatTimer(
              remainingSeconds
            )}
          </span>

        </div>

      </header>


      {/* MAIN CONTENT */}

      <div
        className="
          interview-content
          relative
          z-10
          mx-auto
          w-full
          max-w-[1120px]
          px-[20px]
          pb-[60px]
          pt-[38px]
        "
      >

        <div
          className="
            interview-layout
            grid
            grid-cols-[minmax(0,1fr)_250px]
            items-start
            gap-[30px]
          "
        >

          {/* LEFT SIDE */}

          <div
            className="
              interview-left
              min-w-0
            "
          >

            {/* PROGRESS */}

            <section
              className="
                interview-progress-card
                rounded-[5px]
                bg-white
                px-[17px]
                py-[15px]
              "
            >

              <div
                className="
                  interview-progress-info
                  mb-[10px]
                  flex
                  items-center
                  justify-between
                "
              >

                <span
                  className="
                    interview-progress-text
                    text-[15px]
                    text-[#42424A]
                  "
                >
                  Sual{" "}
                  {currentQuestionIndex +
                    1}
                  /
                  {questions.length}
                </span>


                <span
                  className="
                    interview-progress-count
                    text-[15px]
                    text-[#8C8C95]
                  "
                >
                  Cavablandırılıb:{" "}
                  {answeredCount}
                </span>

              </div>


              <div
                className="
                  interview-progress-track
                  h-[7px]
                  w-full
                  overflow-hidden
                  rounded-full
                  bg-[#D7D7D9]
                "
              >

                <div
                  className="
                    interview-progress-bar
                    h-full
                    rounded-full
                    bg-[#33375B]
                    transition-all
                    duration-300
                  "
                  style={{
                    width:
                      `${progressPercent}%`,
                  }}
                />

              </div>

            </section>


            {/* QUESTION CARD */}

            <section
              className="
                interview-question-card
                mt-[18px]
                min-h-[490px]
                rounded-[5px]
                bg-white
                px-[26px]
                pb-[30px]
                pt-[25px]
              "
            >

              <DifficultyBadge
                difficulty={
                  currentQuestion
                    .difficulty
                }
              />


              <h1
                className="
                  interview-question
                  mt-[26px]
                  max-w-[760px]
                  text-[17px]
                  font-medium
                  leading-[1.55]
                  text-[#303039]
                "
              >
                {
                  currentQuestion
                    .question
                }
              </h1>


              <form
                onSubmit={
                  handleSubmitAnswer
                }
                className="
                  interview-answer-form
                  mt-[20px]
                "
              >

                {currentQuestion
                  .question_type ===
                  "multiple_choice" && (

                  <div
                    className="
                      interview-options
                      flex
                      flex-col
                      gap-[10px]
                    "
                  >

                    {Object.entries(
                      currentQuestion
                        .options ||
                      {}
                    ).map(
                      ([
                        optionKey,
                        optionValue,
                      ]) => {

                        const selected =
                          answer ===
                          optionKey;


                        return (
                          <label
                            key={
                              optionKey
                            }
                            className={`
                              interview-option
                              flex
                              min-h-[54px]
                              cursor-pointer
                              items-center
                              gap-[13px]
                              rounded-[7px]
                              border
                              px-[15px]
                              transition
                              ${
                                selected
                                  ? "border-[#33375B] bg-[#F3F3F7]"
                                  : "border-[#E1E1E5] bg-white hover:border-[#BFC0CB]"
                              }
                            `}
                          >

                            <input
                              type="radio"
                              name="answer"
                              value={
                                optionKey
                              }
                              checked={
                                selected
                              }
                              onChange={
                                event =>
                                  setAnswer(
                                    event
                                      .target
                                      .value
                                  )
                              }
                              disabled={
                                isSubmitting ||
                                isFinishing
                              }
                              className="
                                interview-option-input
                                sr-only
                              "
                            />


                            <span
                              className={`
                                interview-option-letter
                                flex
                                h-[22px]
                                w-[22px]
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                border
                                text-[10px]
                                font-medium
                                ${
                                  selected
                                    ? "border-[#33375B] bg-[#33375B] text-white"
                                    : "border-[#D6D6DB] bg-white text-[#72727C]"
                                }
                              `}
                            >
                              {
                                optionKey
                              }
                            </span>


                            <span
                              className="
                                interview-option-value
                                text-[13px]
                                text-[#3C3C44]
                              "
                            >
                              {
                                optionValue
                              }
                            </span>

                          </label>
                        );
                      }
                    )}

                  </div>

                )}


                {currentQuestion
                  .question_type ===
                  "text" && (

                  <textarea
                    rows="9"
                    value={
                      answer
                    }
                    onChange={
                      event =>
                        setAnswer(
                          event
                            .target
                            .value
                        )
                    }
                    disabled={
                      isSubmitting ||
                      isFinishing
                    }
                    placeholder="Cavabınızı daxil edin..."
                    className="
                      interview-text-answer
                      min-h-[210px]
                      w-full
                      resize-none
                      rounded-[6px]
                      border
                      border-[#DEDEE3]
                      bg-white
                      p-[15px]
                      text-[13px]
                      leading-[1.6]
                      text-[#33333B]
                      outline-none
                      transition
                      placeholder:text-[#A6A6AD]
                      focus:border-[#33375B]
                      disabled:bg-[#F8F8FA]
                    "
                  />

                )}


                {error && (

                  <div
                    className="
                      interview-error
                      mt-[16px]
                      rounded-[4px]
                      border
                      border-[#F0D4D4]
                      bg-[#FFF7F7]
                      px-[12px]
                      py-[9px]
                      text-[12px]
                      text-[#B24747]
                    "
                  >
                    {error}
                  </div>

                )}


                <div
                  className="
                    interview-question-actions
                    mt-[25px]
                    flex
                    justify-end
                  "
                >

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      isFinishing ||
                      !answer.trim()
                    }
                    className="
                      interview-next-button
                      flex
                      min-w-[100px]
                      items-center
                      justify-center
                      rounded-[4px]
                      bg-[#33375B]
                      px-[22px]
                      py-[11px]
                      text-[12px]
                      font-medium
                      text-white
                      transition
                      hover:bg-[#292D4E]
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    {isSubmitting
                      ? "Yadda saxlanılır..."
                      : currentQuestion
                          .answered
                        ? "Cavabı yenilə"
                        : currentQuestionIndex ===
                            questions.length -
                              1
                          ? "Cavabı yadda saxla"
                          : "Sonrakı"}
                  </button>

                </div>

              </form>

            </section>

          </div>


          {/* RIGHT SIDE */}

          <aside
            className="
              interview-navigation-card
              rounded-[5px]
              bg-white
              px-[20px]
              pb-[20px]
              pt-[20px]
            "
          >

            <h2
              className="
                interview-navigation-title
                text-[15px]
                font-semibold
                text-[#2E2E36]
              "
            >
              Sual Naviqasiyası
            </h2>


            <div
              className="
                interview-question-navigation
                mt-[25px]
                grid
                grid-cols-5
                gap-[9px]
              "
            >

              {questions.map(
                (
                  question,
                  index
                ) => {

                  const isCurrent =
                    index ===
                    currentQuestionIndex;


                  const isAnswered =
                    question.answered;


                  return (
                    <button
                      key={
                        question.id
                      }
                      type="button"
                      onClick={() =>
                        handleQuestionNavigation(
                          index
                        )
                      }
                      disabled={
                        isSubmitting ||
                        isFinishing
                      }
                      className={`
                        interview-navigation-button
                        flex
                        h-[36px]
                        w-[36px]
                        items-center
                        justify-center
                        rounded-[4px]
                        text-[11px]
                        font-medium
                        transition
                        disabled:cursor-not-allowed
                        ${
                          isCurrent
                            ? "bg-[#33375B] text-white"
                            : isAnswered
                              ? "bg-[#D4C28F] text-[#33333B]"
                              : "bg-[#F0F0F1] text-[#65656D] hover:bg-[#E5E5E8]"
                        }
                      `}
                    >
                      {
                        question.order
                      }
                    </button>
                  );
                }
              )}

            </div>


            <div
              className="
                interview-legend
                mt-[24px]
                space-y-[11px]
              "
            >

              <LegendItem
                colorClass="bg-[#33375B]"
                text="Hazırkı"
              />

              <LegendItem
                colorClass="bg-[#D4C28F]"
                text={`Cavablandırılmış (${answeredCount})`}
              />

              <LegendItem
                colorClass="bg-[#D8D8DA]"
                text={`Cavablandırılmamış (${questions.length - answeredCount})`}
              />

            </div>


            <div
              className="
                interview-recording-status
                mt-[24px]
                border-t
                border-[#ECECEF]
                pt-[16px]
              "
            >

              <div
                className="
                  interview-recording-row
                  flex
                  items-center
                  gap-[8px]
                "
              >

                <span
                  className={`
                    interview-recording-dot
                    h-[8px]
                    w-[8px]
                    rounded-full
                    ${
                      recordingError
                        ? "bg-[#B24747]"
                        : isRecordingReady
                          ? "bg-[#4F8A61]"
                          : "bg-[#BDBDC3]"
                    }
                  `}
                />


                <span
                  className="
                    interview-recording-text
                    text-[11px]
                    text-[#66666F]
                  "
                >
                  {recordingError
                    ? "Recording xətası"
                    : isRecordingReady
                      ? "Recording aktivdir"
                      : "Recording hazırlanır"}
                </span>

              </div>


              {recordingError && (

                <p
                  className="
                    interview-recording-message
                    mt-[8px]
                    text-[10px]
                    leading-[1.4]
                    text-[#B24747]
                  "
                >
                  {
                    recordingError
                  }
                </p>

              )}

            </div>


            <button
              type="button"
              onClick={
                handleManualFinish
              }
              disabled={
                isSubmitting ||
                isFinishing
              }
              className="
                interview-finish-button
                mt-[25px]
                w-full
                rounded-[4px]
                bg-[#D7D7DF]
                px-[10px]
                py-[11px]
                text-[11px]
                font-medium
                text-[#33375B]
                transition
                hover:bg-[#CACAD4]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {isFinishing
                ? "Tamamlanır..."
                : "İmtahanı tamamla"}
            </button>

          </aside>

        </div>

      </div>

    </main>
  );
}


/*
|--------------------------------------------------------------------------
| PAGE BACKGROUND
|--------------------------------------------------------------------------
*/

function PageBackground({
  children,
}) {
  return (
    <main
      className="
        interview-page
        min-h-screen
        bg-cover
        bg-center
        bg-fixed
        font-archivo
      "
      style={{
        backgroundImage:
          `url(${bgImage})`,
      }}
    >
      {children}
    </main>
  );
}


/*
|--------------------------------------------------------------------------
| DIFFICULTY BADGE
|--------------------------------------------------------------------------
*/

function DifficultyBadge({
  difficulty,
}) {
  const normalized =
    String(
      difficulty ||
      ""
    ).toLowerCase();


  let label =
    difficulty ||
    "-";


  let className =
    "border-[#8794D8] bg-[#F2F4FF] text-[#5366C7]";


  if (
    normalized ===
      "easy" ||
    normalized ===
      "asan"
  ) {

    label =
      "Asan";

    className =
      "border-[#5978FF] bg-[#F3F6FF] text-[#4362E5] text-[12px]";
  }


  if (
    normalized ===
      "medium" ||
    normalized ===
      "orta"
  ) {

    label =
      "Orta";

    className =
      "border-[#D9AC55] bg-[#FFF8E8] text-[#A87422]";
  }


  if (
    normalized ===
      "hard" ||
    normalized ===
      "çətin"
  ) {

    label =
      "Çətin";

    className =
      "border-[#D26A6A] bg-[#FFF2F2] text-[#B64D4D]";
  }


  return (
    <span
      className={`
        interview-difficulty
        inline-flex
        rounded-full
        border
        px-[9px]
        py-[4px]
        text-[10px]
        font-medium
        ${className}
      `}
    >
      {label}
    </span>
  );
}


/*
|--------------------------------------------------------------------------
| LEGEND ITEM
|--------------------------------------------------------------------------
*/

function LegendItem({
  colorClass,
  text,
}) {
  return (
    <div
      className="
        interview-legend-item
        flex
        items-center
        gap-[9px]
      "
    >

      <span
        className={`
          interview-legend-color
          h-[12px]
          w-[12px]
          rounded-[2px]
          ${colorClass}
        `}
      />


      <span
        className="
          interview-legend-text
          text-[12px]
          text-[#55555D]
        "
      >
        {text}
      </span>

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| CLOCK ICON
|--------------------------------------------------------------------------
*/

function ClockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="
        interview-clock-icon
        shrink-0
      "
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        d="M12 7v5l3 2"
      />
    </svg>
  );
}


/*
|--------------------------------------------------------------------------
| CHECK ICON
|--------------------------------------------------------------------------
*/

function CheckIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="m5 12 4 4L19 6"
      />
    </svg>
  );
}


/*
|--------------------------------------------------------------------------
| LOADING SPINNER
|--------------------------------------------------------------------------
*/

function LoadingSpinner() {
  return (
    <span
      className="
        interview-loading-spinner
        mx-auto
        block
        h-[28px]
        w-[28px]
        animate-spin
        rounded-full
        border-[3px]
        border-[#33375B]/20
        border-t-[#33375B]
      "
    />
  );
}


export default Interview;