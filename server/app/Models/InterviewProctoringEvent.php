<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterviewProctoringEvent extends Model
{
    protected $fillable = [
        'interview_id',
        'event_type',
        'event_data',
        'occurred_at',
    ];


    protected function casts(): array
    {
        return [
            'event_data' =>
                'array',

            'occurred_at' =>
                'datetime',
        ];
    }


    public function interview(): BelongsTo
    {
        return $this->belongsTo(
            Interview::class
        );
    }
}
