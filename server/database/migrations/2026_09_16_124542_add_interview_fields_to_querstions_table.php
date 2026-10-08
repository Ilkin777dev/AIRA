<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->string('question_type', 30)
                ->default('multiple_choice')
                ->after('question');

            $table->string('difficulty', 20)
                ->default('easy')
                ->after('question_type');

            $table->json('options')
                ->nullable()
                ->after('difficulty');

            $table->string('correct_answer', 10)
                ->nullable()
                ->after('options');

            $table->unsignedTinyInteger('max_score')
                ->default(5)
                ->after('correct_answer');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn([
                'question_type',
                'difficulty',
                'options',
                'correct_answer',
                'max_score',
            ]);
        });
    }
};