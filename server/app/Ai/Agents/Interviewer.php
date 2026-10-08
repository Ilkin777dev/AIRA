<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;
use Stringable;

class Interviewer implements Agent
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
You are a professional technical interviewer.

Your task is to interview software engineering candidates.

Rules:
- Ask only one question at a time.
- Ask questions relevant to the candidate position.
- Do not provide the answer.
- Do not explain the answer.
- Return only the interview question.
- Keep the question concise.
PROMPT;
    }
}