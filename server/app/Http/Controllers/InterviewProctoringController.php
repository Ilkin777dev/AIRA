<?php

namespace App\Http\Controllers;

use App\Models\Interview;
use App\Models\InterviewProctoringEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InterviewProctoringController extends Controller
{
    public function store(
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
            ], 403);
        }


        if (
            $interview->candidate_profile_id !==
            $candidateProfile->id
        ) {

            return response()->json([
                'message' =>
                    'You do not have access to this interview.',
            ], 403);
        }


        $validated =
            $request->validate([
                'event_type' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'event_data' => [
                    'nullable',
                    'array',
                ],

                'occurred_at' => [
                    'required',
                    'date',
                ],
            ]);


        $event =
            InterviewProctoringEvent::create([
                'interview_id' =>
                    $interview->id,

                'event_type' =>
                    $validated[
                        'event_type'
                    ],

                'event_data' =>
                    $validated[
                        'event_data'
                    ] ?? null,

                'occurred_at' =>
                    $validated[
                        'occurred_at'
                    ],
            ]);


        return response()->json([
            'message' =>
                'Proctoring event stored successfully.',

            'event' =>
                $event,
        ], 201);
    }


    public function storeBatch(
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
            ], 403);
        }


        if (
            $interview->candidate_profile_id !==
            $candidateProfile->id
        ) {

            return response()->json([
                'message' =>
                    'You do not have access to this interview.',
            ], 403);
        }


        $validated =
            $request->validate([
                'events' => [
                    'required',
                    'array',
                    'max:100',
                ],

                'events.*.event_type' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'events.*.event_data' => [
                    'nullable',
                    'array',
                ],

                'events.*.occurred_at' => [
                    'required',
                    'date',
                ],
            ]);


        $rows = [];


        foreach (
            $validated['events']
            as $item
        ) {

            $rows[] = [
                'interview_id' =>
                    $interview->id,

                'event_type' =>
                    $item[
                        'event_type'
                    ],

                'event_data' =>
                    isset(
                        $item[
                            'event_data'
                        ]
                    )
                        ? json_encode(
                            $item[
                                'event_data'
                            ],
                            JSON_UNESCAPED_UNICODE |
                            JSON_UNESCAPED_SLASHES
                        )
                        : null,

                'occurred_at' =>
                    $item[
                        'occurred_at'
                    ],

                'created_at' =>
                    now(),

                'updated_at' =>
                    now(),
            ];
        }


        InterviewProctoringEvent::insert(
            $rows
        );


        return response()->json([
            'message' =>
                'Proctoring events stored successfully.',

            'count' =>
                count(
                    $rows
                ),
        ]);
    }
}
