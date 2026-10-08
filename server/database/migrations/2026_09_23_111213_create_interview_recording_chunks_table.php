<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'interview_recording_chunks',
            function (Blueprint $table) {

                $table->id();

                $table
                    ->foreignId('interview_recording_id')
                    ->constrained()
                    ->cascadeOnDelete();

                $table
                    ->unsignedInteger('chunk_index');

                $table->string('file_path');

                $table
                    ->unsignedBigInteger('file_size');

                $table->timestamps();

                /*
                 * Один chunk index не может
                 * существовать дважды
                 * внутри одной recording.
                 */
                $table->unique([
                    'interview_recording_id',
                    'chunk_index',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'interview_recording_chunks'
        );
    }
};