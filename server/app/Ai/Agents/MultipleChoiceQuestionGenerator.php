<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;

class MultipleChoiceQuestionGenerator implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): string
    {
        return <<<'PROMPT'
You are a professional technical interviewer.

Your task is to generate technical multiple-choice interview questions.

Rules:
- Generate exactly one technical question.
- The question must match the requested job position.
- Follow the requested difficulty level.
- Generate exactly four answer options: A, B, C and D.
- Only one option must be correct.
- Wrong options must be realistic and technically plausible.
- Avoid trick questions.
- Do not make the correct answer obvious.
- Do not repeat previous questions.
PROMPT;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'question' => $schema
                ->string()
                ->required(),

            'option_a' => $schema
                ->string()
                ->required(),

            'option_b' => $schema
                ->string()
                ->required(),

            'option_c' => $schema
                ->string()
                ->required(),

            'option_d' => $schema
                ->string()
                ->required(),

            'correct_answer' => $schema
                ->string()
                ->required(),
        ];
    }
}