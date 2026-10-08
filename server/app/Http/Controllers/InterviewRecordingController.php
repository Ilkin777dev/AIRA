<?php

namespace App\Http\Controllers;

use App\Models\Interview;
use App\Models\InterviewRecording;
use App\Models\InterviewRecordingChunk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Throwable;

class InterviewRecordingController extends Controller
{
    /**
     * Start recording session.
     */
    public function start(
        Request $request,
        Interview $interview
    ): JsonResponse {
        $candidateProfile =
            $request->user()?->candidateProfile;

        if (!$candidateProfile) {
            return response()->json([
                'message' => 'Candidate profile not found.',
            ], 403);
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

        /*
         * Если recording уже есть,
         * возвращаем существующую session.
         */
        $existingRecording =
            InterviewRecording::where(
                'interview_id',
                $interview->id
            )->first();

        if ($existingRecording) {
            return response()->json([
                'message' =>
                    'Recording session already exists.',

                'recording' =>
                    $existingRecording,
            ]);
        }

        $recording =
            InterviewRecording::create([
                'interview_id' =>
                    $interview->id,

                'status' =>
                    'uploading',

                'file_path' =>
                    null,

                'mime_type' =>
                    'video/webm',

                'file_size' =>
                    0,

                'duration_seconds' =>
                    null,

                'started_at' =>
                    now(),

                'finished_at' =>
                    null,
            ]);

        return response()->json([
            'message' =>
                'Recording session started successfully.',

            'recording' =>
                $recording,
        ], 201);
    }


    /**
     * Upload one recording chunk.
     */
    public function uploadChunk(
        Request $request,
        InterviewRecording $recording
    ): JsonResponse {
        $candidateProfile =
            $request->user()?->candidateProfile;

        if (!$candidateProfile) {
            return response()->json([
                'message' =>
                    'Candidate profile not found.',
            ], 403);
        }

        $recording->load(
            'interview'
        );

        if (
            !$recording->interview ||
            $recording
                ->interview
                ->candidate_profile_id
            !== $candidateProfile->id
        ) {
            return response()->json([
                'message' =>
                    'You do not have access to this recording.',
            ], 403);
        }

        if (
            in_array(
                $recording->status,
                [
                    'processing',
                    'completed',
                ],
                true
            )
        ) {
            return response()->json([
                'message' =>
                    'Recording no longer accepts chunks.',
            ], 409);
        }

        $validated =
            $request->validate([
                'chunk' => [
                    'required',
                    'file',
                    'max:51200',
                ],

                'chunk_index' => [
                    'required',
                    'integer',
                    'min:0',
                ],
            ]);

        $chunk =
            $request->file(
                'chunk'
            );

        $chunkIndex =
            (int) $validated[
                'chunk_index'
            ];

        $chunkFileName =
            'chunk_' .
            str_pad(
                (string) $chunkIndex,
                6,
                '0',
                STR_PAD_LEFT
            ) .
            '.webm';

        $directory =
            'interview-recordings/' .
            $recording->id .
            '/chunks';

        $filePath =
            $directory .
            '/' .
            $chunkFileName;

        Storage::disk('local')
            ->putFileAs(
                $directory,
                $chunk,
                $chunkFileName
            );

        $fileSize =
            Storage::disk('local')
                ->size(
                    $filePath
                );

        DB::transaction(
            function () use (
                $recording,
                $chunkIndex,
                $filePath,
                $fileSize
            ) {
                InterviewRecordingChunk::updateOrCreate(
                    [
                        'interview_recording_id' =>
                            $recording->id,

                        'chunk_index' =>
                            $chunkIndex,
                    ],
                    [
                        'file_path' =>
                            $filePath,

                        'file_size' =>
                            $fileSize,
                    ]
                );

                $totalSize =
                    InterviewRecordingChunk::where(
                        'interview_recording_id',
                        $recording->id
                    )
                        ->sum(
                            'file_size'
                        );

                $recording->update([
                    'file_size' =>
                        $totalSize,

                    'status' =>
                        'uploading',
                ]);
            }
        );

        return response()->json([
            'message' =>
                'Chunk uploaded successfully.',

            'chunk' => [
                'chunk_index' =>
                    $chunkIndex,

                'file_size' =>
                    $fileSize,
            ],
        ]);
    }


    /**
     * Finalize recording.
     *
     * Chunks
     *   ↓
     * combined-temp.webm
     *   ↓
     * FFmpeg
     *   ↓
     * interview.webm
     */
    public function finalize(
        Request $request,
        InterviewRecording $recording
    ): JsonResponse {
        $candidateProfile =
            $request->user()?->candidateProfile;

        if (!$candidateProfile) {
            return response()->json([
                'message' =>
                    'Candidate profile not found.',
            ], 403);
        }

        $recording->load(
            'interview'
        );

        if (
            !$recording->interview ||
            $recording
                ->interview
                ->candidate_profile_id
            !== $candidateProfile->id
        ) {
            return response()->json([
                'message' =>
                    'You do not have access to this recording.',
            ], 403);
        }

        /*
         * Если уже собрали видео —
         * повторно FFmpeg не запускаем.
         */
        if (
            $recording->status ===
            'completed' &&
            $recording->file_path
        ) {
            return response()->json([
                'message' =>
                    'Recording is already completed.',

                'recording' =>
                    $recording,
            ]);
        }

        $validated =
            $request->validate([
                'duration_seconds' => [
                    'nullable',
                    'integer',
                    'min:0',
                ],
            ]);

        /*
         * Получаем chunks строго
         * в правильном порядке.
         */
        $chunks =
            $recording
                ->chunks()
                ->orderBy(
                    'chunk_index'
                )
                ->get();

        if ($chunks->isEmpty()) {
            return response()->json([
                'message' =>
                    'No recording chunks were uploaded.',
            ], 422);
        }

        /*
         * Проверяем:
         *
         * 0,1,2,3,4...
         *
         * Если какого-то chunk нет,
         * видео пока собирать нельзя.
         */
        foreach (
            $chunks as $expectedIndex => $chunk
        ) {
            if (
                $chunk->chunk_index
                !== $expectedIndex
            ) {
                return response()->json([
                    'message' =>
                        'Recording chunks are incomplete.',

                    'expected_chunk_index' =>
                        $expectedIndex,

                    'received_chunk_index' =>
                        $chunk->chunk_index,
                ], 422);
            }

            if (
                !Storage::disk('local')
                    ->exists(
                        $chunk->file_path
                    )
            ) {
                return response()->json([
                    'message' =>
                        'Recording chunk file is missing.',

                    'chunk_index' =>
                        $chunk->chunk_index,
                ], 422);
            }
        }

        $recording->update([
            'status' =>
                'processing',
        ]);

        /*
         * Финальная директория:
         *
         * interview-recordings/5/
         */
        $recordingDirectory =
            'interview-recordings/' .
            $recording->id;

        Storage::disk('local')
            ->makeDirectory(
                $recordingDirectory
            );

        /*
         * Сначала бинарно восстанавливаем
         * MediaRecorder WebM stream.
         */
        $temporaryPath =
            $recordingDirectory .
            '/combined-temp.webm';

        /*
         * После FFmpeg здесь будет
         * нормальный финальный WebM.
         */
        $finalPath =
            $recordingDirectory .
            '/interview.webm';

        $temporaryAbsolutePath =
            Storage::disk('local')
                ->path(
                    $temporaryPath
                );

        $finalAbsolutePath =
            Storage::disk('local')
                ->path(
                    $finalPath
                );

        try {
            /*
             * =================================================
             * COMBINE CHUNKS
             * =================================================
             */

            $outputHandle =
                fopen(
                    $temporaryAbsolutePath,
                    'wb'
                );

            if (!$outputHandle) {
                throw new \RuntimeException(
                    'Could not create temporary recording file.'
                );
            }

            try {
                foreach (
                    $chunks as $chunk
                ) {
                    $chunkAbsolutePath =
                        Storage::disk('local')
                            ->path(
                                $chunk->file_path
                            );

                    $inputHandle =
                        fopen(
                            $chunkAbsolutePath,
                            'rb'
                        );

                    if (!$inputHandle) {
                        throw new \RuntimeException(
                            'Could not open chunk: ' .
                            $chunk->chunk_index
                        );
                    }

                    try {
                        stream_copy_to_stream(
                            $inputHandle,
                            $outputHandle
                        );
                    } finally {
                        fclose(
                            $inputHandle
                        );
                    }
                }
            } finally {
                fclose(
                    $outputHandle
                );
            }

            /*
             * =================================================
             * FFMPEG REMUX
             * =================================================
             *
             * Мы НЕ перекодируем видео.
             *
             * -c copy
             *
             * Поэтому процесс намного быстрее.
             */
            $process =
                new Process([
                    'C:\\Users\\Ilkin.Kerimli\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe',

                    '-y',

                    '-i',
                    $temporaryAbsolutePath,

                    '-map',
                    '0',

                    '-c',
                    'copy',

                    $finalAbsolutePath,
                ]);

            /*
             * На длинном интервью даём
             * FFmpeg достаточно времени.
             */
            $process->setTimeout(
                600
            );

            $process->run();

            if (
                !$process->isSuccessful()
            ) {
                throw new \RuntimeException(
                    'FFmpeg failed: ' .
                    $process->getErrorOutput()
                );
            }

            /*
             * Проверяем, что файл реально
             * появился.
             */
            if (
                !Storage::disk('local')
                    ->exists(
                        $finalPath
                    )
            ) {
                throw new \RuntimeException(
                    'Final recording file was not created.'
                );
            }

            $finalFileSize =
                Storage::disk('local')
                    ->size(
                        $finalPath
                    );

            /*
             * =================================================
             * DATABASE
             * =================================================
             */

            $recording->update([
                'status' =>
                    'completed',

                'file_path' =>
                    $finalPath,

                'mime_type' =>
                    'video/webm',

                'file_size' =>
                    $finalFileSize,

                'duration_seconds' =>
                    $validated[
                        'duration_seconds'
                    ] ?? null,

                'finished_at' =>
                    now(),
            ]);

            /*
             * =================================================
             * CLEAN TEMP FILE
             * =================================================
             */

            Storage::disk('local')
                ->delete(
                    $temporaryPath
                );

            /*
             * =================================================
             * DELETE CHUNK FILES
             * =================================================
             *
             * Только ПОСЛЕ того, как
             * final video успешно создан.
             */

            Storage::disk('local')
                ->deleteDirectory(
                    $recordingDirectory .
                    '/chunks'
                );

            /*
             * Chunk metadata нам тоже
             * больше не нужна.
             */
            $recording
                ->chunks()
                ->delete();

            return response()->json([
                'message' =>
                    'Recording finalized successfully.',

                'recording' => [
                    'id' =>
                        $recording->id,

                    'interview_id' =>
                        $recording->interview_id,

                    'status' =>
                        $recording->status,

                    'file_path' =>
                        $recording->file_path,

                    'file_size' =>
                        $recording->file_size,

                    'duration_seconds' =>
                        $recording->duration_seconds,

                    'started_at' =>
                        $recording->started_at,

                    'finished_at' =>
                        $recording->finished_at,

                    'chunks_processed' =>
                        $chunks->count(),
                ],
            ]);
        } catch (Throwable $error) {
            /*
             * Если FFmpeg или merge упал,
             * chunks НЕ удаляем.
             *
             * Значит запись можно
             * восстановить позже.
             */
            $recording->update([
                'status' =>
                    'failed',
            ]);

            /*
             * Удаляем только потенциально
             * битые temp/final файлы.
             */
            Storage::disk('local')
                ->delete([
                    $temporaryPath,
                    $finalPath,
                ]);

            report(
                $error
            );

            return response()->json([
                'message' =>
                    'Failed to build final interview recording.',

                'error' =>
                    $error->getMessage(),
            ], 500);
        }
    }
}