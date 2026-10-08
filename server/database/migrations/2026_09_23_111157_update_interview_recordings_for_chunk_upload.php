<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('interview_recordings', function (Blueprint $table) {
            $table
                ->string('status')
                ->default('uploading')
                ->after('interview_id');

            $table
                ->timestamp('started_at')
                ->nullable();

            $table
                ->timestamp('finished_at')
                ->nullable();

            /*
             * Пока запись идёт,
             * итогового файла ещё нет.
             */
            $table
                ->string('file_path')
                ->nullable()
                ->change();
        });
    }

    public function down(): void
    {
        Schema::table('interview_recordings', function (Blueprint $table) {
            $table->dropColumn([
                'status',
                'started_at',
                'finished_at',
            ]);

            $table
                ->string('file_path')
                ->nullable(false)
                ->change();
        });
    }
};