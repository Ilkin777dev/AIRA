<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;
use Stringable;

class InterviewSummaryGenerator implements Agent
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
You are preparing a final technical interview summary for a recruiter.

Rules:

- Use only information provided from the interview.
- Do not invent candidate experience.
- Do not invent skills.
- Describe strengths demonstrated during the interview.
- Describe weaknesses demonstrated during the interview.
- Mention areas that need improvement.
- Do not include a numeric total score.
- Do not give a hiring decision.
- Keep the summary concise and professional.
- Return only the summary.
PROMPT;
    }
}