<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;

class CvAnalyzer implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): string
    {
        return <<<'PROMPT'
You are a professional technical recruiter and CV analyst.

Analyze the candidate CV and determine the candidate's professional profile.

Your task is to identify:

- technical skills
- soft skills
- experience level
- up to 3 suitable professional positions

IMPORTANT RULES:

- Use only information supported by the CV.
- Do not invent technologies that are not present.
- Do not invent work experience.
- Infer suitable professional roles from the candidate's experience, responsibilities, education and skills.
- Suggested positions do NOT need to exist in any predefined vacancy list.
- Use normal professional job titles such as:
  Project Manager
  Product Manager
  Laravel Developer
  Backend Developer
  Frontend Developer
  Data Analyst
  DevOps Engineer
  QA Engineer
  Cybersecurity Analyst
- The examples above are examples only. Do not force the candidate into them.
- Return maximum 3 suitable positions.
- Order suggested positions from most suitable to less suitable.
- Keep position names concise.
- Keep skill names concise.
- Do not add explanations to skill names.
- experience_level must be one of:
  junior
  middle
  senior
PROMPT;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'technical_skills' => $schema
                ->array()
                ->items(
                    $schema->string()
                )
                ->required(),

            'soft_skills' => $schema
                ->array()
                ->items(
                    $schema->string()
                )
                ->required(),

            'experience_level' => $schema
                ->string()
                ->enum([
                    'junior',
                    'middle',
                    'senior',
                ])
                ->required(),

            'suggested_positions' => $schema
                ->array()
                ->items(
                    $schema->string()
                )
                ->required(),
        ];
    }
}