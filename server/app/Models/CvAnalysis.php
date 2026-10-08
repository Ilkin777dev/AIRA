<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'uuid',
    'original_file_name',
    'file_path',
    'technical_skills',
    'soft_skills',
    'suggested_positions',
    'experience_level',
    'selected_position',
    'selected_position_id',
    'candidate_profile_id',
    'status',
])]
class CvAnalysis extends Model
{
    protected $casts = [
        'technical_skills' => 'array',
        'soft_skills' => 'array',
        'suggested_positions' => 'array',
    ];

    public function selectedPosition(): BelongsTo
    {
        return $this->belongsTo(
            Position::class,
            'selected_position_id'
        );
    }

    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(
            CandidateProfile::class
        );
    }
}