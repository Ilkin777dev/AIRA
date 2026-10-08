<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Question extends Model
{
    protected $fillable = [
        'interview_id',
        'question',
        'question_type',
        'difficulty',
        'options',
        'correct_answer',
        'max_score',
        'order',
        'source',
    ];

    protected $casts = [
        'options' => 'array',
        'max_score' => 'integer',
    ];

    protected $hidden = [
        'correct_answer',
    ];

    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }

    public function answer(): HasOne
    {
        return $this->hasOne(Answer::class);
    }
}