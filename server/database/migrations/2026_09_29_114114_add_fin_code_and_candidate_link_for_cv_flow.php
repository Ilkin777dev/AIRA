<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidate_profiles', function (Blueprint $table) {
            $table->string('fin_code', 20)
                ->nullable()
                ->unique();
        });

        Schema::table('cv_analyses', function (Blueprint $table) {
            $table->foreignId('candidate_profile_id')
                ->nullable()
                ->constrained('candidate_profiles')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cv_analyses', function (Blueprint $table) {
            $table->dropForeign([
                'candidate_profile_id',
            ]);

            $table->dropColumn(
                'candidate_profile_id'
            );
        });

        Schema::table('candidate_profiles', function (Blueprint $table) {
            $table->dropUnique([
                'fin_code',
            ]);

            $table->dropColumn(
                'fin_code'
            );
        });
    }
};