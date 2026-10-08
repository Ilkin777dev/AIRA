<?php

namespace App\Http\Controllers;

use App\Models\Answer;
use App\Models\Question;
use App\Services\InterviewAIService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnswerController extends Controller
{
    private const INTERVIEW_DURATION_MINUTES = 30;

    public function __construct(
        private InterviewAIService $interviewAIService
    ) {
    }

    public function store(
        Request $request,
        Question $question
    ): JsonResponse {
        $validatedData = $request->validate([
            'answer' => [
                'required',
                'string',
            ],
        ]);

        $user = $request->user();

        $candidateProfile = $user->candidateProfile;

        if (!$candidateProfile) {
            return response()->json([
                'message' => 'Candidate profile not found.',
            ], 404);
        }

        $interview = $question->interview;

        if (!$interview) {
            return response()->json([
                'message' => 'Interview not found.',
            ], 404);
        }

        /*
        |--------------------------------------------------------------------------
        | OWNER CHECK
        |--------------------------------------------------------------------------
        */

        if (
            $interview->candidate_profile_id
            !== $candidateProfile->id
        ) {
            return response()->json([
                'message' =>
                    'You cannot answer this question.',
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | INTERVIEW STATUS
        |--------------------------------------------------------------------------
        */

        if (
            $interview->status !==
            'in_progress'
        ) {
            return response()->json([
                'message' =>
                    'This interview is not active.',
            ], 409);
        }

        /*
        |--------------------------------------------------------------------------
        | SERVER-SIDE TIME LIMIT
        |--------------------------------------------------------------------------
        */

        if (!$interview->started_at) {
            return response()->json([
                'message' =>
                    'Interview start time not found.',
            ], 409);
        }

        $startedAt = $interview->started_at;

        /*
         * Safety:
         *
         * If started_at is returned as a string,
         * convert it manually to Carbon.
         */
        if (is_string($startedAt)) {
            $startedAt = Carbon::parse(
                $startedAt
            );
        }

        $expiresAt =
            $startedAt
                ->copy()
                ->addMinutes(
                    self::INTERVIEW_DURATION_MINUTES
                );

        if (
            now()->greaterThanOrEqualTo(
                $expiresAt
            )
        ) {
            return response()->json([
                'message' =>
                    'Interview time has expired.',

                'interview_expired' =>
                    true,

                'remaining_seconds' =>
                    0,
            ], 409);
        }

        /*
        |--------------------------------------------------------------------------
        | MULTIPLE CHOICE
        |--------------------------------------------------------------------------
        */

        if (
            $question->question_type ===
            'multiple_choice'
        ) {
            $selectedAnswer =
                strtoupper(
                    trim(
                        $validatedData[
                            'answer'
                        ]
                    )
                );

            if (
                !in_array(
                    $selectedAnswer,
                    [
                        'A',
                        'B',
                        'C',
                        'D',
                    ],
                    true
                )
            ) {
                return response()->json([
                    'message' =>
                        'Invalid answer option.',
                ], 422);
            }

            $options =
                $question->options
                ?? [];

            if (
                !array_key_exists(
                    $selectedAnswer,
                    $options
                )
            ) {
                return response()->json([
                    'message' =>
                        'Selected answer option does not exist.',
                ], 422);
            }

            $isCorrect =
                $selectedAnswer ===
                $question->correct_answer;

            $answer =
                Answer::updateOrCreate(
                    [
                        'question_id' =>
                            $question->id,
                    ],
                    [
                        'answer' =>
                            $selectedAnswer,

                        'is_correct' =>
                            $isCorrect,

                        'score' =>
                            $isCorrect
                                ? $question->max_score
                                : 0,

                        'ai_feedback' =>
                            null,
                    ]
                );
        }

        /*
        |--------------------------------------------------------------------------
        | TEXT ANSWER
        |--------------------------------------------------------------------------
        */

        elseif (
            $question->question_type ===
            'text'
        ) {
            $answerText =
                trim(
                    $validatedData[
                        'answer'
                    ]
                );

            if ($answerText === '') {
                return response()->json([
                    'message' =>
                        'Answer cannot be empty.',
                ], 422);
            }

            $answer =
                Answer::updateOrCreate(
                    [
                        'question_id' =>
                            $question->id,
                    ],
                    [
                        'answer' =>
                            $answerText,

                        'is_correct' =>
                            null,

                        'score' =>
                            null,

                        'ai_feedback' =>
                            null,
                    ]
                );

            /*
             * AI evaluates the latest hard answer.
             */
            $evaluation =
                $this
                    ->interviewAIService
                    ->evaluateHardAnswer(
                        $interview,
                        $answer
                    );

            $answer->update([
                'score' =>
                    $evaluation[
                        'score'
                    ],

                'ai_feedback' =>
                    $evaluation[
                        'feedback'
                    ],
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | UNKNOWN QUESTION TYPE
        |--------------------------------------------------------------------------
        */

        else {
            return response()->json([
                'message' =>
                    'Unknown question type.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | PROGRESS
        |--------------------------------------------------------------------------
        */

        $answeredCount =
            $interview
                ->questions()
                ->whereHas(
                    'answer'
                )
                ->count();

        $remainingSeconds =
            max(
                0,
                (int) now()->diffInSeconds(
                    $expiresAt,
                    false
                )
            );

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'message' =>
                'Answer saved successfully.',

            'answer' => [
                'question_id' =>
                    $question->id,

                'answer' =>
                    $answer->answer,
            ],

            'answered_count' =>
                $answeredCount,

            'total_questions' =>
                10,

            'progress_percent' =>
                $answeredCount * 10,

            'remaining_seconds' =>
                $remainingSeconds,

            'interview_completed' =>
                false,
        ], 200);
    }
}