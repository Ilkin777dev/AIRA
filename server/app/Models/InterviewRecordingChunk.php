<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterviewRecordingChunk extends Model
{
    protected $fillable = [
        'interview_recording_id',
        'chunk_index',
        'file_path',
        'file_size',
    ];

    protected $casts = [
        'chunk_index' => 'integer',
        'file_size' => 'integer',
    ];

    public function recording(): BelongsTo
    {
        return $this->belongsTo(
            InterviewRecording::class,
            'interview_recording_id'
        );
    }
}