<?php

namespace App\Http\Controllers;

use App\Models\Interview;
use App\Models\InterviewRecording;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AdminInterviewRecordingController extends Controller
{
    /**
     * Find recording by interview ID.
     */
    public function byInterview(
        Interview $interview
    ): JsonResponse {
        $recording =
            InterviewRecording::where(
                'interview_id',
                $interview->id
            )->first();

        /*
         * Recording может отсутствовать,
         * например для старых interviews.
         */
        if (!$recording) {
            return response()->json([
                'recording' => null,
            ]);
        }

        return response()->json([
            'recording' =>
                $this->recordingData(
                    $recording
                ),
        ]);
    }


    /**
     * Return recording metadata.
     */
    public function show(
        InterviewRecording $recording
    ): JsonResponse {
        return response()->json([
            'recording' =>
                $this->recordingData(
                    $recording
                ),
        ]);
    }


    /**
     * Stream/download private
     * interview recording.
     */
    public function video(
        InterviewRecording $recording
    ): BinaryFileResponse|JsonResponse {
        /*
         * Only completed recording
         * can be viewed.
         */
        if (
            $recording->status !==
            'completed'
        ) {
            return response()->json([
                'message' =>
                    'Recording is not completed yet.',
            ], 409);
        }


        /*
         * Final file_path
         * must exist.
         */
        if (!$recording->file_path) {
            return response()->json([
                'message' =>
                    'Recording file path not found.',
            ], 404);
        }


        /*
         * Physical file must exist.
         */
        if (
            !Storage::disk('local')
                ->exists(
                    $recording->file_path
                )
        ) {
            return response()->json([
                'message' =>
                    'Recording file not found.',
            ], 404);
        }


        $absolutePath =
            Storage::disk('local')
                ->path(
                    $recording->file_path
                );


        return response()->file(
            $absolutePath,
            [
                'Content-Type' =>
                    $recording->mime_type
                    ?: 'video/webm',

                'Content-Disposition' =>
                    'inline',

                'Cache-Control' =>
                    'private, no-store, no-cache, must-revalidate',

                'Pragma' =>
                    'no-cache',
            ]
        );
    }


    /**
     * Normalize recording data.
     */
    private function recordingData(
        InterviewRecording $recording
    ): array {
        $hasVideo = false;

        if ($recording->file_path) {
            $hasVideo =
                Storage::disk('local')
                    ->exists(
                        $recording->file_path
                    );
        }

        return [
            'id' =>
                $recording->id,

            'interview_id' =>
                $recording->interview_id,

            'status' =>
                $recording->status,

            'mime_type' =>
                $recording->mime_type,

            'file_size' =>
                $recording->file_size,

            'duration_seconds' =>
                $recording->duration_seconds,

            'started_at' =>
                $recording->started_at,

            'finished_at' =>
                $recording->finished_at,

            'has_video' =>
                $hasVideo,
        ];
    }
}