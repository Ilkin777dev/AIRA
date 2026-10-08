<?php

use App\Http\Controllers\AdminCandidateController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\AdminInterviewRecordingController;
use App\Http\Controllers\AdminProctoringController;
use App\Http\Controllers\AnswerController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CvAnalysisController;
use App\Http\Controllers\InterviewController;
use App\Http\Controllers\InterviewProctoringController;
use App\Http\Controllers\InterviewRecordingController;
use App\Http\Controllers\PositionController;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| POSITIONS
|--------------------------------------------------------------------------
*/

Route::get(
    '/positions',
    [PositionController::class, 'index']
);


/*
|--------------------------------------------------------------------------
| CV ANALYSIS
|--------------------------------------------------------------------------
*/

Route::post(
    '/cv/analyze',
    [CvAnalysisController::class, 'analyze']
);


Route::post(
    '/cv/{cvAnalysis}/confirm-position',
    [CvAnalysisController::class, 'confirmPosition']
);


/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

Route::post(
    '/register',
    [AuthController::class, 'register']
);


Route::post(
    '/login',
    [AuthController::class, 'login']
);


/*
|--------------------------------------------------------------------------
| AUTHENTICATED USER ROUTES
|--------------------------------------------------------------------------
*/

Route::middleware(
    'auth:sanctum'
)
    ->group(function () {


        /*
        |--------------------------------------------------------------------------
        | CURRENT USER
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/me',
            function (
                Request $request
            ) {

                $user =
                    $request
                        ->user()
                        ->load([
                            'candidateProfile.position',
                            'candidateProfile.latestInterview',
                        ]);


                return response()->json([
                    'user' =>
                        $user,
                ]);
            }
        );


        /*
        |--------------------------------------------------------------------------
        | LOGOUT
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/logout',
            [AuthController::class, 'logout']
        );


        /*
        |--------------------------------------------------------------------------
        | INTERVIEW
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/interviews/start',
            [InterviewController::class, 'start']
        );


        Route::get(
            '/interviews/{interview}/questions',
            [InterviewController::class, 'questions']
        );


        Route::post(
            '/interviews/{interview}/finish',
            [InterviewController::class, 'finish']
        );


        /*
        |--------------------------------------------------------------------------
        | PROCTORING
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/interviews/{interview}/proctoring-events',
            [InterviewProctoringController::class, 'store']
        );


        Route::post(
            '/interviews/{interview}/proctoring-events/batch',
            [InterviewProctoringController::class, 'storeBatch']
        );


        /*
        |--------------------------------------------------------------------------
        | RECORDING START
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/interviews/{interview}/recording/start',
            [InterviewRecordingController::class, 'start']
        );


        /*
        |--------------------------------------------------------------------------
        | RECORDING CHUNKS
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/interview-recordings/{recording}/chunks',
            [InterviewRecordingController::class, 'uploadChunk']
        );


        /*
        |--------------------------------------------------------------------------
        | RECORDING FINALIZE
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/interview-recordings/{recording}/finalize',
            [InterviewRecordingController::class, 'finalize']
        );


        /*
        |--------------------------------------------------------------------------
        | ANSWERS
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/questions/{question}/answer',
            [AnswerController::class, 'store']
        );
    });


/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
*/

Route::middleware([
    'auth:sanctum',
    'admin',
])
    ->prefix('admin')
    ->group(function () {


        /*
        |--------------------------------------------------------------------------
        | ADMIN DASHBOARD
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/dashboard',
            [AdminDashboardController::class, 'index']
        );


        /*
        |--------------------------------------------------------------------------
        | CANDIDATES
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/candidates',
            [AdminCandidateController::class, 'index']
        );


        Route::get(
            '/candidates/{candidateProfile}',
            [AdminCandidateController::class, 'show']
        );


        /*
        |--------------------------------------------------------------------------
        | RECORDINGS
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/interviews/{interview}/recording',
            [
                AdminInterviewRecordingController::class,
                'byInterview',
            ]
        );


        Route::get(
            '/interview-recordings/{recording}',
            [
                AdminInterviewRecordingController::class,
                'show',
            ]
        );


        Route::get(
            '/interview-recordings/{recording}/video',
            [
                AdminInterviewRecordingController::class,
                'video',
            ]
        );


        /*
        |--------------------------------------------------------------------------
        | PROCTORING
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/interviews/{interview}/proctoring',
            [
                AdminProctoringController::class,
                'show',
            ]
        );


        Route::get(
            '/interviews/{interview}/proctoring/report',
            [
                AdminProctoringController::class,
                'report',
            ]
        );
    });
