<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InterviewRecording extends Model
{
    protected $fillable = [
        'interview_id',
        'status',
        'file_path',
        'mime_type',
        'file_size',
        'duration_seconds',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'duration_seconds' => 'integer',

        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function interview(): BelongsTo
    {
        return $this->belongsTo(
            Interview::class
        );
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(
            InterviewRecordingChunk::class
        );
    }
}