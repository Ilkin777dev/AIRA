<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'candidate_profile_id',
    'position_id',
    'status',
    'started_at',
    'finished_at',
    'score',
    'result',
    'ai_summary',
])]
class Interview extends Model
{
    public function proctoringEvents(): HasMany
    {
        return $this->hasMany(
            InterviewProctoringEvent::class
        );
    }
    
    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'score' => 'integer',
    ];

    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(
            CandidateProfile::class
        );
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(
            Position::class
        );
    }

    public function questions(): HasMany
    {
        return $this->hasMany(
            Question::class
        );
    }

    public function recording(): HasOne
    {
        return $this->hasOne(
            InterviewRecording::class
        );
    }
}