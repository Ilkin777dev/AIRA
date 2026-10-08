<?php

namespace App\Http\Controllers;

use App\Models\CandidateProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCandidateController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | CANDIDATES LIST
    |--------------------------------------------------------------------------
    */

    public function index(
        Request $request
    ): JsonResponse {

        $search =
            $request->query(
                'search'
            );

        $result =
            $request->query(
                'result'
            );

        $status =
            $request->query(
                'status'
            );

        $positionId =
            $request->query(
                'position_id'
            );

        $date =
            $request->query(
                'date'
            );


        /*
        |--------------------------------------------------------------------------
        | BASE QUERY
        |--------------------------------------------------------------------------
        */

        $query =
            CandidateProfile::query()
                ->with([
                    'user',

                    'position',

                    'interviews' =>
                        function (
                            $query
                        ) {

                            $query
                                ->latest(
                                    'finished_at'
                                )
                                ->latest(
                                    'id'
                                );
                        },
                ]);


        /*
        |--------------------------------------------------------------------------
        | INTERVIEW FILTERS
        |--------------------------------------------------------------------------
        |
        | whereHas применяется только если реально выбран
        | хотя бы один interview filter.
        |
        | Благодаря этому кандидаты без интервью
        | тоже отображаются.
        |
        */

        if (
            $result ||
            $status ||
            $date
        ) {

            $query->whereHas(
                'interviews',
                function (
                    $query
                ) use (
                    $result,
                    $status,
                    $date
                ) {

                    if (
                        $result
                    ) {

                        $query->where(
                            'result',
                            $result
                        );
                    }


                    if (
                        $status
                    ) {

                        $query->where(
                            'status',
                            $status
                        );
                    }


                    if (
                        $date
                    ) {

                        $query
                            ->whereDate(
                                'finished_at',
                                $date
                            );
                    }
                }
            );
        }


        /*
        |--------------------------------------------------------------------------
        | POSITION FILTER
        |--------------------------------------------------------------------------
        */

        $query->when(
            $positionId,

            function (
                $query,
                $positionId
            ) {

                $query->where(
                    'position_id',
                    $positionId
                );
            }
        );


        /*
        |--------------------------------------------------------------------------
        | SEARCH
        |--------------------------------------------------------------------------
        */

        $query->when(
            $search,

            function (
                $query,
                $search
            ) {

                $search =
                    trim(
                        $search
                    );


                $query->where(
                    function (
                        $query
                    ) use (
                        $search
                    ) {

                        $query
                            ->where(
                                'name',
                                'ilike',
                                "%{$search}%"
                            )

                            ->orWhere(
                                'surname',
                                'ilike',
                                "%{$search}%"
                            )

                            ->orWhereRaw(
                                "CONCAT(name, ' ', surname) ILIKE ?",
                                [
                                    "%{$search}%"
                                ]
                            )

                            ->orWhereRaw(
                                "CONCAT(surname, ' ', name) ILIKE ?",
                                [
                                    "%{$search}%"
                                ]
                            );
                    }
                );
            }
        );


        /*
        |--------------------------------------------------------------------------
        | GET CANDIDATES
        |--------------------------------------------------------------------------
        */

        $candidates =
            $query
                ->get()


                /*
                |--------------------------------------------------------------------------
                | SORT
                |--------------------------------------------------------------------------
                |
                | Последние интервью наверху.
                |
                | Если интервью нет — используем created_at кандидата.
                |
                */

                ->sortByDesc(
                    function (
                        $candidate
                    ) {

                        return (
                            $candidate
                                ->interviews
                                ->first()
                                ?->finished_at
                            ??
                            $candidate
                                ->created_at
                        );
                    }
                )

                ->values();


        /*
        |--------------------------------------------------------------------------
        | NORMALIZE RESPONSE
        |--------------------------------------------------------------------------
        */

        $data =
            $candidates
                ->map(
                    function (
                        $candidate
                    ) {

                        $latestInterview =
                            $candidate
                                ->interviews
                                ->first();


                        return [

                            'id' =>
                                $candidate->id,


                            'name' =>
                                $candidate->name,


                            'surname' =>
                                $candidate->surname,


                            'email' =>
                                $candidate
                                    ->user
                                    ?->email,


                            'phone' =>
                                $candidate->phone,


                            'position' =>
                                $candidate
                                    ->position
                                    ?->name,


                            'position_id' =>
                                $candidate
                                    ->position_id,


                            'score' =>
                                $latestInterview
                                    ?->score,


                            'result' =>
                                $latestInterview
                                    ?->result,


                            'status' =>
                                $latestInterview
                                    ?->status,


                            'started_at' =>
                                $latestInterview
                                    ?->started_at,


                            'finished_at' =>
                                $latestInterview
                                    ?->finished_at,
                        ];
                    }
                );


        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([

            'message' =>
                'Candidates retrieved successfully.',

            'candidates' =>
                $data,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | CANDIDATE DETAILS
    |--------------------------------------------------------------------------
    */

    public function show(
        CandidateProfile $candidateProfile
    ): JsonResponse {


        /*
        |--------------------------------------------------------------------------
        | LOAD RELATIONS
        |--------------------------------------------------------------------------
        */

        $candidateProfile
            ->load([

                'user',

                'position',

                'interviews' =>
                    function (
                        $query
                    ) {

                        $query
                            ->latest(
                                'id'
                            )
                            ->with([
                                'questions.answer',
                            ]);
                    },
            ]);


        /*
        |--------------------------------------------------------------------------
        | LATEST INTERVIEW
        |--------------------------------------------------------------------------
        */

        $interview =
            $candidateProfile
                ->interviews
                ->first();


        /*
        |--------------------------------------------------------------------------
        | CANDIDATE DATA
        |--------------------------------------------------------------------------
        */

        $candidateData = [

            'id' =>
                $candidateProfile
                    ->id,


            'name' =>
                $candidateProfile
                    ->name,


            'surname' =>
                $candidateProfile
                    ->surname,


            'patronymic' =>
                $candidateProfile
                    ->patronymic,


            'email' =>
                $candidateProfile
                    ->user
                    ?->email,


            'phone' =>
                $candidateProfile
                    ->phone,


            'fin_code' =>
                $candidateProfile
                    ->fin_code,


            'position' =>
                $candidateProfile
                    ->position
                    ?->name,


            'position_id' =>
                $candidateProfile
                    ->position_id,
        ];


        /*
        |--------------------------------------------------------------------------
        | NO INTERVIEW
        |--------------------------------------------------------------------------
        */

        if (
            !$interview
        ) {

            return response()->json([

                'message' =>
                    'Candidate has no interviews.',

                'candidate' =>
                    $candidateData,

                'interview' =>
                    null,
            ]);
        }


        /*
        |--------------------------------------------------------------------------
        | QUESTIONS
        |--------------------------------------------------------------------------
        */

        $questions =
            $interview
                ->questions
                ->sortBy(
                    'order'
                )
                ->values()

                ->map(
                    function (
                        $question
                    ) {

                        return [

                            'id' =>
                                $question->id,


                            'order' =>
                                $question->order,


                            'question' =>
                                $question
                                    ->question,


                            'question_type' =>
                                $question
                                    ->question_type,


                            'difficulty' =>
                                $question
                                    ->difficulty,


                            'options' =>
                                $question
                                    ->options,


                            /*
                            |--------------------------------------------------------------------------
                            | CORRECT ANSWER
                            |--------------------------------------------------------------------------
                            |
                            | Только admin получает correct_answer.
                            |
                            */

                            'correct_answer' =>
                                $question
                                    ->question_type ===
                                'multiple_choice'

                                    ? $question
                                        ->correct_answer

                                    : null,


                            'max_score' =>
                                $question
                                    ->max_score,


                            /*
                            |--------------------------------------------------------------------------
                            | CANDIDATE ANSWER
                            |--------------------------------------------------------------------------
                            */

                            'answer' =>
                                $question
                                    ->answer
                                    ?->answer,


                            'is_correct' =>
                                $question
                                    ->answer
                                    ?->is_correct,


                            'score' =>
                                $question
                                    ->answer
                                    ?->score,


                            'ai_feedback' =>
                                $question
                                    ->answer
                                    ?->ai_feedback,
                        ];
                    }
                );


        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([

            'message' =>
                'Candidate details retrieved successfully.',


            'candidate' =>
                $candidateData,


            'interview' => [

                'id' =>
                    $interview->id,


                'status' =>
                    $interview->status,


                'score' =>
                    $interview->score,


                'result' =>
                    $interview->result,


                'ai_summary' =>
                    $interview
                        ->ai_summary,


                'started_at' =>
                    $interview
                        ->started_at,


                'finished_at' =>
                    $interview
                        ->finished_at,


                'questions' =>
                    $questions,
            ],
        ]);
    }
}