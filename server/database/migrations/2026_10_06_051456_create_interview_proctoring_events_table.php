<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'interview_proctoring_events',
            function (
                Blueprint $table
            ) {

                $table->id();

                $table
                    ->foreignId(
                        'interview_id'
                    )
                    ->constrained()
                    ->cascadeOnDelete();

                $table->string(
                    'event_type',
                    100
                );

                $table
                    ->jsonb(
                        'event_data'
                    )
                    ->nullable();

                $table->timestampTz(
                    'occurred_at'
                );

                $table->timestamps();

                $table->index([
                    'interview_id',
                    'event_type',
                ]);

                $table->index(
                    'occurred_at'
                );
            }
        );
    }


    public function down(): void
    {
        Schema::dropIfExists(
            'interview_proctoring_events'
        );
    }
};
