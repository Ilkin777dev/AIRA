<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cv_analyses', function (Blueprint $table) {
            $table->id();

            $table->uuid('uuid')->unique();

            $table->string('original_file_name');
            $table->string('file_path');

            $table->json('technical_skills')->nullable();
            $table->json('soft_skills')->nullable();
            $table->json('suggested_position_ids')->nullable();

            $table->string('experience_level')->nullable();

            $table->string('status')
                ->default('uploaded');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cv_analyses');
    }
};