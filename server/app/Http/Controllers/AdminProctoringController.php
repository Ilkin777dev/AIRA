<?php

namespace App\Http\Controllers;

use App\Models\Interview;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class AdminProctoringController extends Controller
{
    public function show(
        Interview $interview
    ): JsonResponse {

        $events =
            $interview
                ->proctoringEvents()
                ->orderBy(
                    'occurred_at'
                )
                ->get();


        $statistics = [
            'total_events' =>
                $events->count(),

            'blocked_shortcuts' =>
                $events
                    ->where(
                        'event_type',
                        'blocked_shortcut'
                    )
                    ->count(),

            'focus_losses' =>
                $events
                    ->where(
                        'event_type',
                        'window_blur'
                    )
                    ->count(),

            'fullscreen_exit_attempts' =>
                $events
                    ->where(
                        'event_type',
                        'fullscreen_exit'
                    )
                    ->count(),

            'process_started' =>
                $events
                    ->where(
                        'event_type',
                        'process_started'
                    )
                    ->count(),

            'process_stopped' =>
                $events
                    ->where(
                        'event_type',
                        'process_stopped'
                    )
                    ->count(),
        ];


        return response()->json([
            'statistics' =>
                $statistics,

            'events' =>
                $events,
        ]);
    }


    public function report(
        Interview $interview
    ): Response {

        $interview->load([
            'candidateProfile.user',
            'candidateProfile.position',
        ]);


        $events =
            $interview
                ->proctoringEvents()
                ->orderBy(
                    'occurred_at'
                )
                ->get();


        $statistics = [
            'total_events' =>
                $events->count(),

            'blocked_shortcuts' =>
                $events
                    ->where(
                        'event_type',
                        'blocked_shortcut'
                    )
                    ->count(),

            'focus_losses' =>
                $events
                    ->where(
                        'event_type',
                        'window_blur'
                    )
                    ->count(),

            'fullscreen_exit_attempts' =>
                $events
                    ->where(
                        'event_type',
                        'fullscreen_exit'
                    )
                    ->count(),

            'process_started' =>
                $events
                    ->where(
                        'event_type',
                        'process_started'
                    )
                    ->count(),

            'process_stopped' =>
                $events
                    ->where(
                        'event_type',
                        'process_stopped'
                    )
                    ->count(),
        ];


        $candidate =
            $interview
                ->candidateProfile;


        $startedEvent =
            $events
                ->firstWhere(
                    'event_type',
                    'proctoring_started'
                );


        $initialProcesses =
            collect(
                $startedEvent
                    ?->event_data[
                        'processes'
                    ] ?? []
            )
                ->filter()
                ->values();


        $fileName =
            "aira-proctoring-interview-{$interview->id}.pdf";


        $pdf =
            Pdf::loadView(
                'admin.proctoring-report',
                [
                    'interview' =>
                        $interview,

                    'candidate' =>
                        $candidate,

                    'events' =>
                        $events,

                    'statistics' =>
                        $statistics,

                    'initialProcesses' =>
                        $initialProcesses,
                ]
            )
                ->setPaper(
                    'a4',
                    'portrait'
                );


        return $pdf->download(
            $fileName
        );
    }
}
