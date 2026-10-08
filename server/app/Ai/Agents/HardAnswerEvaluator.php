<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;

class HardAnswerEvaluator implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): string
    {
        return <<<'PROMPT'
You are a professional technical interviewer evaluating a candidate answer.

Rules:

- Evaluate only technical quality.
- Evaluate correctness.
- Evaluate completeness.
- Evaluate reasoning quality.
- Do not judge grammar unless it changes technical meaning.
- Do not invent candidate experience.
- Give concise professional feedback.
- Follow the requested scoring range.
PROMPT;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'score' => $schema
                ->integer()
                ->required(),

            'feedback' => $schema
                ->string()
                ->required(),
        ];
    }
}