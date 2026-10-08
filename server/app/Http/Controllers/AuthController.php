<?php

namespace App\Http\Controllers;

use App\Models\CandidateProfile;
use App\Models\CvAnalysis;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;


class AuthController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | USERS
    |--------------------------------------------------------------------------
    */

    public function index(): JsonResponse
    {
        $candidates =
            User::query()
                ->where(
                    'role',
                    'candidate'
                )
                ->with([
                    'candidateProfile.position',
                    'candidateProfile.cvAnalysis',
                    'candidateProfile.latestInterview',
                ])
                ->get();


        return response()->json([
            'message' =>
                'Candidates retrieved successfully.',

            'candidates' =>
                $candidates,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | REGISTER
    |--------------------------------------------------------------------------
    */

    public function register(
        Request $request
    ): JsonResponse {

        $validatedData =
            $request->validate([

                'name' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'surname' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'patronymic' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'email' => [
                    'required',
                    'email',
                    'max:255',
                    'unique:users,email',
                ],

                'phone' => [
                    'required',
                    'string',
                    'max:30',
                ],

                'fin_code' => [
                    'required',
                    'string',
                    'min:5',
                    'max:20',
                    'unique:candidate_profiles,fin_code',
                ],

                'password' => [
                    'required',
                    'string',
                    'min:8',
                    'confirmed',
                ],

                'cv_analysis_id' => [
                    'required',
                    'integer',
                    'exists:cv_analyses,id',
                ],
            ]);


        $result =
            DB::transaction(
                function () use (
                    $validatedData
                ) {

                    /*
                    |--------------------------------------------------------------------------
                    | CV ANALYSIS
                    |--------------------------------------------------------------------------
                    */

                    $cvAnalysis =
                        CvAnalysis::query()
                            ->lockForUpdate()
                            ->findOrFail(
                                $validatedData[
                                    'cv_analysis_id'
                                ]
                            );


                    /*
                    |--------------------------------------------------------------------------
                    | CHECK STATUS
                    |--------------------------------------------------------------------------
                    */

                    if (
                        $cvAnalysis->status !==
                        'confirmed'
                    ) {

                        throw ValidationException
                            ::withMessages([
                                'cv_analysis_id' => [
                                    'CV position must be confirmed before registration.',
                                ],
                            ]);
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | CHECK POSITION
                    |--------------------------------------------------------------------------
                    */

                    if (
                        !$cvAnalysis
                            ->selected_position_id
                    ) {

                        throw ValidationException
                            ::withMessages([
                                'cv_analysis_id' => [
                                    'Selected position was not found.',
                                ],
                            ]);
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | PREVENT REUSE
                    |--------------------------------------------------------------------------
                    */

                    if (
                        $cvAnalysis
                            ->candidate_profile_id
                    ) {

                        throw ValidationException
                            ::withMessages([
                                'cv_analysis_id' => [
                                    'This CV analysis has already been used for registration.',
                                ],
                            ]);
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | CREATE USER
                    |--------------------------------------------------------------------------
                    */

                    $user =
                        User::create([

                            'name' =>
                                trim(
                                    $validatedData[
                                        'name'
                                    ]
                                ),

                            'email' =>
                                strtolower(
                                    trim(
                                        $validatedData[
                                            'email'
                                        ]
                                    )
                                ),

                            'password' =>
                                Hash::make(
                                    $validatedData[
                                        'password'
                                    ]
                                ),

                            'role' =>
                                'candidate',
                        ]);


                    /*
                    |--------------------------------------------------------------------------
                    | CREATE PROFILE
                    |--------------------------------------------------------------------------
                    */

                    $candidateProfile =
                        CandidateProfile::create([

                            'user_id' =>
                                $user->id,

                            'position_id' =>
                                $cvAnalysis
                                    ->selected_position_id,

                            'name' =>
                                trim(
                                    $validatedData[
                                        'name'
                                    ]
                                ),

                            'surname' =>
                                trim(
                                    $validatedData[
                                        'surname'
                                    ]
                                ),

                            'patronymic' =>
                                trim(
                                    $validatedData[
                                        'patronymic'
                                    ]
                                ),

                            'phone' =>
                                trim(
                                    $validatedData[
                                        'phone'
                                    ]
                                ),

                            'fin_code' =>
                                strtoupper(
                                    trim(
                                        $validatedData[
                                            'fin_code'
                                        ]
                                    )
                                ),
                        ]);


                    /*
                    |--------------------------------------------------------------------------
                    | LINK CV
                    |--------------------------------------------------------------------------
                    */

                    $cvAnalysis->update([
                        'candidate_profile_id' =>
                            $candidateProfile->id,
                    ]);


                    return [
                        'user' =>
                            $user,

                        'candidate_profile' =>
                            $candidateProfile,

                        'cv_analysis' =>
                            $cvAnalysis,
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
                'Candidate registered successfully.',

            'user' =>
                $result['user'],

            'candidate_profile' =>
                $result[
                    'candidate_profile'
                ]
                    ->load(
                        'position'
                    ),

            'cv_analysis' => [

                'id' =>
                    $result[
                        'cv_analysis'
                    ]->id,

                'uuid' =>
                    $result[
                        'cv_analysis'
                    ]->uuid,

                'technical_skills' =>
                    $result[
                        'cv_analysis'
                    ]->technical_skills,

                'soft_skills' =>
                    $result[
                        'cv_analysis'
                    ]->soft_skills,

                'experience_level' =>
                    $result[
                        'cv_analysis'
                    ]->experience_level,

                'suggested_positions' =>
                    $result[
                        'cv_analysis'
                    ]->suggested_positions,

                'selected_position' =>
                    $result[
                        'cv_analysis'
                    ]->selected_position,

                'status' =>
                    $result[
                        'cv_analysis'
                    ]->status,
            ],

        ], 201);
    }


    /*
    |--------------------------------------------------------------------------
    | LOGIN
    |--------------------------------------------------------------------------
    |
    | Desktop authentication.
    |
    | No session.
    | No cookie.
    | No CSRF.
    |
    | Laravel Sanctum Personal Access Token.
    |
    */

    public function login(
        Request $request
    ): JsonResponse {

        $validatedData =
            $request->validate([

                'email' => [
                    'required',
                    'email',
                ],

                'password' => [
                    'required',
                    'string',
                ],
            ]);


        $email =
            strtolower(
                trim(
                    $validatedData[
                        'email'
                    ]
                )
            );


        /*
        |--------------------------------------------------------------------------
        | USER
        |--------------------------------------------------------------------------
        */

        $user =
            User::query()
                ->where(
                    'email',
                    $email
                )
                ->first();


        /*
        |--------------------------------------------------------------------------
        | PASSWORD CHECK
        |--------------------------------------------------------------------------
        */

        if (
            !$user ||
            !Hash::check(
                $validatedData[
                    'password'
                ],
                $user->password
            )
        ) {

            return response()->json([
                'message' =>
                    'Email və ya şifrə yanlışdır.',
            ], 401);
        }


        /*
        |--------------------------------------------------------------------------
        | CREATE SANCTUM TOKEN
        |--------------------------------------------------------------------------
        */

        $token =
            $user
                ->createToken(
                    'aira-desktop'
                )
                ->plainTextToken;


        /*
        |--------------------------------------------------------------------------
        | USER DATA
        |--------------------------------------------------------------------------
        */

        $user->load(
            'candidateProfile.position'
        );


        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([

            'message' =>
                'Uğurla daxil oldunuz.',

            'token_type' =>
                'Bearer',

            'access_token' =>
                $token,

            'user' =>
                $user,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */

    public function logout(
        Request $request
    ): JsonResponse {

        /*
        |--------------------------------------------------------------------------
        | DELETE CURRENT TOKEN
        |--------------------------------------------------------------------------
        */

        $currentToken =
            $request
                ->user()
                ?->currentAccessToken();


        if (
            $currentToken
        ) {

            $currentToken
                ->delete();
        }


        return response()->json([
            'message' =>
                'Logged out successfully.',
        ]);
    }
}