<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interview_recordings', function (Blueprint $table) {
            $table->id();

            $table
                ->foreignId('interview_id')
                ->unique()
                ->constrained()
                ->cascadeOnDelete();

            $table->string('file_path');

            $table
                ->string('mime_type')
                ->default('video/webm');

            $table
                ->unsignedBigInteger('file_size')
                ->nullable();

            $table
                ->unsignedInteger('duration_seconds')
                ->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'interview_recordings'
        );
    }
};