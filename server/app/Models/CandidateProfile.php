<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'user_id',
    'position_id',
    'name',
    'surname',
    'patronymic',
    'phone',
    'fin_code',
])]
class CandidateProfile extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class
        );
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(
            Position::class
        );
    }

    public function interviews(): HasMany
    {
        return $this->hasMany(
            Interview::class
        );
    }

    public function latestInterview(): HasOne
    {
        return $this->hasOne(
            Interview::class
        )->latestOfMany();
    }

    public function cvAnalysis(): HasOne
    {
        return $this->hasOne(
            CvAnalysis::class
        );
    }
}