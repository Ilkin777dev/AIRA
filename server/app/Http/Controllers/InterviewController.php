<?php

namespace App\Http\Controllers;

use App\Models\Interview;
use App\Models\Question;
use App\Services\InterviewAIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;
use Carbon\Carbon;

class InterviewController extends Controller
{
    private const INTERVIEW_DURATION_MINUTES = 30;

    private const QUESTIONS_COUNT = 10;


    public function __construct(
        private InterviewAIService $interviewAIService
    ) {
    }


    /*
    |--------------------------------------------------------------------------
    | START / RESUME INTERVIEW
    |--------------------------------------------------------------------------
    */

    public function start(
        Request $request
    ): JsonResponse {
        /*
         * Local Ollama generation can take
         * more than PHP's default 30 seconds.
         *
         * For now we allow up to 5 minutes.
         */
        set_time_limit(300);


        $user =
            $request->user();


        $candidateProfile =
            $user?->candidateProfile;


        if (!$candidateProfile) {
            return response()->json([
                'message' =>
                    'Candidate profile not found.',
            ], 404);
        }


        /*
        |--------------------------------------------------------------------------
        | CHECK EXISTING INTERVIEW
        |--------------------------------------------------------------------------
        */

        $existingInterview =
            Interview::query()
                ->where(
                    'candidate_profile_id',
                    $candidateProfile->id
                )
                ->where(
                    'status',
                    'in_progress'
                )
                ->latest('id')
                ->first();


        /*
        |--------------------------------------------------------------------------
        | RESUME EXISTING INTERVIEW
        |--------------------------------------------------------------------------
        */

        if ($existingInterview) {

            /*
             * First check remaining time.
             *
             * If interview is already expired,
             * we do not call Ollama.
             */
            $remainingSeconds =
                $this->getRemainingSeconds(
                    $existingInterview
                );


            if ($remainingSeconds <= 0) {
                return response()->json([
                    'message' =>
                        'Interview time has expired.',

                    'interview' =>
                        $existingInterview,

                    'questions' =>
                        $this->candidateQuestions(
                            $existingInterview
                        ),

                    'remaining_seconds' =>
                        0,

                    'interview_expired' =>
                        true,
                ], 409);
            }


            /*
             * Support old interviews
             * created before bulk generation.
             */
            try {

                $this->ensureAllQuestionsExist(
                    $existingInterview
                );

            } catch (Throwable $error) {

                report(
                    $error
                );


                return response()->json([
                    'message' =>
                        'Failed to prepare interview questions.',

                    /*
                     * Development only.
                     * Remove later in production.
                     */
                    'error' =>
                        $error->getMessage(),
                ], 500);
            }


            $questions =
                $this->candidateQuestions(
                    $existingInterview
                );


            return response()->json([
                'message' =>
                    'Interview resumed successfully.',

                'interview' =>
                    $existingInterview,

                /*
                 * Compatibility with Dashboard.jsx.
                 */
                'question' =>
                    $questions[0] ?? null,

                /*
                 * New Interview.jsx.
                 */
                'questions' =>
                    $questions,

                'remaining_seconds' =>
                    $remainingSeconds,

                'interview_expired' =>
                    false,
            ], 200);
        }


        /*
        |--------------------------------------------------------------------------
        | CREATE NEW INTERVIEW
        |--------------------------------------------------------------------------
        */

        $interview =
            Interview::create([
                'candidate_profile_id' =>
                    $candidateProfile->id,

                'position_id' =>
                    $candidateProfile->position_id,

                'status' =>
                    'in_progress',

                'started_at' =>
                    now(),
            ]);


        /*
        |--------------------------------------------------------------------------
        | GENERATE ALL 10 QUESTIONS
        |--------------------------------------------------------------------------
        |
        | ONE request:
        |
        | Laravel
        |   ↓
        | InterviewAIService
        |   ↓
        | Ollama
        |   ↓
        | qwen3:4b
        |   ↓
        | 10 questions
        |
        */

        try {

            $questionsData =
                $this
                    ->interviewAIService
                    ->generateInterviewQuestions(
                        $interview
                    );


            /*
             * Safety check.
             */
            if (
                count($questionsData)
                !== self::QUESTIONS_COUNT
            ) {
                throw new RuntimeException(
                    'AI must return exactly 10 questions.'
                );
            }


            /*
             * Save all questions in one transaction.
             *
             * If one insert fails,
             * none of the 10 questions remain partially saved.
             */
            DB::transaction(
                function () use ($interview, $questionsData) {

                    foreach (
                        $questionsData as $questionData
                    ) {

                        Question::create([
                            'interview_id' =>
                                $interview->id,

                            'question' =>
                                $questionData[
                                    'question'
                                ],

                            'question_type' =>
                                $questionData[
                                    'question_type'
                                ],

                            'difficulty' =>
                                $questionData[
                                    'difficulty'
                                ],

                            'options' =>
                                $questionData[
                                    'options'
                                ],

                            'correct_answer' =>
                                $questionData[
                                    'correct_answer'
                                ],

                            'max_score' =>
                                $questionData[
                                    'max_score'
                                ],

                            'order' =>
                                $questionData[
                                    'order'
                                ],

                            'source' =>
                                'ai',
                        ]);
                    }
                }
            );

        } catch (Throwable $error) {

            /*
             * Do not leave broken
             * in_progress interview behind.
             */
            $interview
                ->questions()
                ->delete();


            $interview->delete();


            report(
                $error
            );


            return response()->json([
                'message' =>
                    'Failed to generate interview questions.',

                /*
                 * Development only.
                 */
                'error' =>
                    $error->getMessage(),
            ], 500);
        }


        /*
        |--------------------------------------------------------------------------
        | PREPARE RESPONSE
        |--------------------------------------------------------------------------
        */

        $questions =
            $this->candidateQuestions(
                $interview
            );


        return response()->json([
            'message' =>
                'Interview started successfully!',

            'interview' =>
                $interview,

            /*
             * Compatibility with Dashboard.jsx.
             */
            'question' =>
                $questions[0] ?? null,

            /*
             * All 10 questions.
             */
            'questions' =>
                $questions,

            /*
             * 30 minutes.
             */
            'remaining_seconds' =>
                self::INTERVIEW_DURATION_MINUTES
                * 60,

            'interview_expired' =>
                false,
        ], 201);
    }


    /*
    |--------------------------------------------------------------------------
    | GET INTERVIEW QUESTIONS
    |--------------------------------------------------------------------------
    */

    public function questions(
        Request $request,
        Interview $interview
    ): JsonResponse {
        $candidateProfile =
            $request
                ->user()
                    ?->candidateProfile;


        if (!$candidateProfile) {
            return response()->json([
                'message' =>
                    'Candidate profile not found.',
            ], 404);
        }


        if (
            $interview->candidate_profile_id
            !== $candidateProfile->id
        ) {
            return response()->json([
                'message' =>
                    'You do not have access to this interview.',
            ], 403);
        }


        $remainingSeconds =
            $this->getRemainingSeconds(
                $interview
            );


        return response()->json([
            'interview' =>
                $interview,

            'questions' =>
                $this->candidateQuestions(
                    $interview
                ),

            'remaining_seconds' =>
                $remainingSeconds,

            'interview_expired' =>
                $remainingSeconds <= 0,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | FINISH INTERVIEW
    |--------------------------------------------------------------------------
    */

    public function finish(
        Request $request,
        Interview $interview
    ): JsonResponse {
        /*
         * Final summary from local AI may also
         * require more than 30 seconds.
         */
        set_time_limit(300);


        $candidateProfile =
            $request
                ->user()
                    ?->candidateProfile;


        if (!$candidateProfile) {
            return response()->json([
                'message' =>
                    'Candidate profile not found.',
            ], 404);
        }


        if (
            $interview->candidate_profile_id
            !== $candidateProfile->id
        ) {
            return response()->json([
                'message' =>
                    'You cannot finish this interview.',
            ], 403);
        }


        /*
        |--------------------------------------------------------------------------
        | IDEMPOTENT FINISH
        |--------------------------------------------------------------------------
        */

        if (
            $interview->status ===
            'completed'
        ) {
            return response()->json([
                'message' =>
                    'Interview is already completed.',

                'interview_completed' =>
                    true,

                'interview' =>
                    $interview,
            ]);
        }


        /*
        |--------------------------------------------------------------------------
        | FINAL SCORE
        |--------------------------------------------------------------------------
        */

        $score =
            $this
                ->interviewAIService
                ->calculateFinalScore(
                    $interview
                );


        /*
        |--------------------------------------------------------------------------
        | RESULT
        |--------------------------------------------------------------------------
        */

        $result =
            $this
                ->interviewAIService
                ->getResult(
                    $score
                );


        /*
        |--------------------------------------------------------------------------
        | LOCAL AI SUMMARY
        |--------------------------------------------------------------------------
        */

        try {

            $summary =
                $this
                    ->interviewAIService
                    ->generateFinalSummary(
                        $interview
                    );

        } catch (Throwable $error) {

            report(
                $error
            );


            /*
             * Summary failure should not block
             * interview completion.
             */
            $summary =
                'AI summary could not be generated.';
        }


        /*
        |--------------------------------------------------------------------------
        | COMPLETE INTERVIEW
        |--------------------------------------------------------------------------
        */

        $interview->update([
            'status' =>
                'completed',

            'finished_at' =>
                now(),

            'score' =>
                $score,

            'result' =>
                $result,

            'ai_summary' =>
                $summary,
        ]);


        return response()->json([
            'message' =>
                'Interview finished successfully!',

            'interview_completed' =>
                true,

            'interview' =>
                $interview->fresh(),
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | ENSURE ALL QUESTIONS EXIST
    |--------------------------------------------------------------------------
    |
    | Mainly needed for old
    | in_progress interviews.
    |
    */

    private function ensureAllQuestionsExist(
        Interview $interview
    ): void {
        $existingOrders =
            $interview
                ->questions()
                ->pluck(
                    'order'
                )
                ->map(
                    fn($order) =>
                        (int) $order
                )
                ->all();


        /*
         * All 10 already exist.
         */
        if (
            count($existingOrders)
            === self::QUESTIONS_COUNT
        ) {
            return;
        }


        /*
         * ONE Ollama request.
         */
        $questionsData =
            $this
                ->interviewAIService
                ->generateInterviewQuestions(
                    $interview
                );


        if (
            count($questionsData)
            !== self::QUESTIONS_COUNT
        ) {
            throw new RuntimeException(
                'AI must return exactly 10 questions.'
            );
        }


        DB::transaction(
            function () use ($interview, $questionsData, $existingOrders) {

                foreach (
                    $questionsData as $questionData
                ) {

                    $order =
                        (int) $questionData[
                            'order'
                        ];


                    /*
                     * Keep existing question.
                     */
                    if (
                        in_array(
                            $order,
                            $existingOrders,
                            true
                        )
                    ) {
                        continue;
                    }


                    Question::create([
                        'interview_id' =>
                            $interview->id,

                        'question' =>
                            $questionData[
                                'question'
                            ],

                        'question_type' =>
                            $questionData[
                                'question_type'
                            ],

                        'difficulty' =>
                            $questionData[
                                'difficulty'
                            ],

                        'options' =>
                            $questionData[
                                'options'
                            ],

                        'correct_answer' =>
                            $questionData[
                                'correct_answer'
                            ],

                        'max_score' =>
                            $questionData[
                                'max_score'
                            ],

                        'order' =>
                            $order,

                        'source' =>
                            'ai',
                    ]);
                }
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CANDIDATE QUESTIONS RESPONSE
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | correct_answer is NEVER returned
    | to the candidate.
    |
    */

    private function candidateQuestions(
        Interview $interview
    ): array {
        $questions =
            $interview
                ->questions()
                ->with(
                    'answer'
                )
                ->orderBy(
                    'order'
                )
                ->get();


        return $questions
            ->map(
                function (Question $question) {

                    return [
                        'id' =>
                            $question->id,

                        'interview_id' =>
                            $question->interview_id,

                        'question' =>
                            $question->question,

                        'question_type' =>
                            $question->question_type,

                        'difficulty' =>
                            $question->difficulty,

                        'options' =>
                            $question->options,

                        'max_score' =>
                            $question->max_score,

                        'order' =>
                            $question->order,

                        'source' =>
                            $question->source,

                        /*
                         * Candidate's own answer.
                         */
                        'answer' =>
                            $question
                                ->answer
                                    ?->answer,

                        'answered' =>
                            $question
                                ->answer
                            !== null,
                    ];
                }
            )
            ->values()
            ->all();
    }


    /*
    |--------------------------------------------------------------------------
    | REMAINING TIME
    |--------------------------------------------------------------------------
    */

    private function getRemainingSeconds(
        Interview $interview
    ): int {
        if (!$interview->started_at) {
            return self::INTERVIEW_DURATION_MINUTES * 60;
        }

        $startedAt = $interview->started_at;

        /*
         * Дополнительная защита.
         *
         * Если Laravel по какой-либо причине
         * вернул started_at как string,
         * превращаем его в Carbon вручную.
         */
        if (is_string($startedAt)) {
            $startedAt = Carbon::parse($startedAt);
        }

        $expiresAt = $startedAt
            ->copy()
            ->addMinutes(
                self::INTERVIEW_DURATION_MINUTES
            );

        $remainingSeconds =
            now()->diffInSeconds(
                $expiresAt,
                false
            );

        return max(
            0,
            (int) $remainingSeconds
        );
    }
}