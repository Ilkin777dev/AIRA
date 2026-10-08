<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Position;

class PositionController extends Controller
{
    public function index(): JsonResponse
    {
        $positions = Position::where('is_active', true)->get();

        return response()->json([
            'message' => 'Here are the positions',
            'positions' => $positions,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ]);

        $position = Position::create($validatedData);

        return response()->json([
            'message' => 'Position created successfully!',
            'position' => $position,
        ], 201);
    }
}