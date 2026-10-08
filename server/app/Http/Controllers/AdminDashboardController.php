<?php

namespace App\Http\Controllers;

use App\Models\CandidateProfile;
use App\Models\Interview;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $totalCandidates = CandidateProfile::count();

        $completedInterviews = Interview::where(
            'status',
            'completed'
        )->count();

        $strongCandidates = Interview::where(
            'status',
            'completed'
        )
            ->where('result', 'strong')
            ->count();

        $mediumCandidates = Interview::where(
            'status',
            'completed'
        )
            ->where('result', 'medium')
            ->count();

        $weakCandidates = Interview::where(
            'status',
            'completed'
        )
            ->where('result', 'weak')
            ->count();

        return response()->json([
            'message' => 'Admin dashboard statistics retrieved successfully.',

            'statistics' => [
                'total_candidates' => $totalCandidates,
                'completed_interviews' => $completedInterviews,
                'strong' => $strongCandidates,
                'medium' => $mediumCandidates,
                'weak' => $weakCandidates,
            ],
        ]);
    }
}