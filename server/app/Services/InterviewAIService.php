<?php

namespace App\Services;

use App\Ai\Agents\HardAnswerEvaluator;
use App\Ai\Agents\Interviewer;
use App\Ai\Agents\InterviewQuestionSetGenerator;
use App\Ai\Agents\InterviewSummaryGenerator;
use App\Ai\Agents\MultipleChoiceQuestionGenerator;
use App\Models\Answer;
use App\Models\Interview;
use Laravel\Ai\Enums\Lab;
use RuntimeException;
use Throwable;

class InterviewAIService
{
    private const MODEL = 'openai/gpt-oss-20b';


    /*
    |--------------------------------------------------------------------------
    | Generate ALL 10 Questions
    |--------------------------------------------------------------------------
    |
    | ONE Groq request.
    |
    | 1 - 4  = Easy   / Multiple Choice / 5 points
    | 5 - 8  = Medium / Multiple Choice / 10 points
    | 9 - 10 = Hard   / Text Answer     / 20 points
    |
    */

    public function generateInterviewQuestions(
        Interview $interview
    ): array {
        $interview->load(
            'position'
        );


        $positionName =
            $interview
                ->position
                ?->name;


        if (!$positionName) {
            throw new RuntimeException(
                'Interview position not found.'
            );
        }


        $prompt = <<<PROMPT
Candidate position:
{$positionName}

Generate exactly 10 technical interview questions.

Required order:

Questions 1-4:
- easy
- multiple_choice
- exactly four options
- max_score = 5

Questions 5-8:
- medium
- multiple_choice
- exactly four options
- max_score = 10

Questions 9-10:
- hard
- text answer
- max_score = 20

For questions 9-10 return empty strings for:
- option_a
- option_b
- option_c
- option_d
- correct_answer

Requirements:

- Questions must be directly relevant to {$positionName}.
- Do not repeat questions.
- Keep every question concise.
- Keep multiple-choice options concise.
- Wrong options must be realistic.
- Avoid trick questions.
- correct_answer for questions 1-8 must be only A, B, C or D.
PROMPT;


        $lastError = null;


        /*
         * One retry in case provider returns
         * an invalid structure.
         */
        for (
            $attempt = 1;
            $attempt <= 2;
            $attempt++
        ) {
            try {

                $response =
                    (
                        new InterviewQuestionSetGenerator()
                    )->prompt(
                        $prompt,
                        provider: Lab::Groq,
                        model: self::MODEL,
                    );


                $questions =
                    $response[
                        'questions'
                    ] ?? null;


                if (!is_array($questions)) {
                    throw new RuntimeException(
                        'AI did not return a questions array.'
                    );
                }


                return $this
                    ->validateAndNormalizeQuestions(
                        $questions
                    );

            } catch (Throwable $error) {

                $lastError =
                    $error;


                report(
                    $error
                );
            }
        }


        throw new RuntimeException(
            'Groq failed to generate valid interview questions: ' .
            (
                $lastError
                    ?->getMessage()
                ?? 'Unknown error.'
            )
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Generate ONE Question
    |--------------------------------------------------------------------------
    |
    | Kept for compatibility.
    |
    | Main interview flow uses
    | generateInterviewQuestions().
    |
    */

    public function generateQuestion(
        Interview $interview,
        int $order
    ): array {
        if (
            $order < 1 ||
            $order > 10
        ) {
            throw new RuntimeException(
                'Question order must be between 1 and 10.'
            );
        }


        $interview->load(
            'position'
        );


        $positionName =
            $interview
                ->position
                ?->name;


        if (!$positionName) {
            throw new RuntimeException(
                'Interview position not found.'
            );
        }


        $difficulty =
            $this->getDifficulty(
                $order
            );


        $maxScore =
            $this->getMaxScore(
                $order
            );


        $previousQuestions =
            $interview
                ->questions()
                ->orderBy(
                    'order'
                )
                ->pluck(
                    'question'
                )
                ->implode("\n");


        /*
        |--------------------------------------------------------------------------
        | Multiple Choice
        |--------------------------------------------------------------------------
        */

        if ($order <= 8) {

            $response =
                (
                    new MultipleChoiceQuestionGenerator()
                )->prompt(
                    "
                    Candidate position:
                    {$positionName}

                    Current question:
                    {$order} of 10

                    Difficulty:
                    {$difficulty}

                    Previous questions:
                    {$previousQuestions}

                    Generate one new technical question.

                    Do not repeat previous questions.

                    correct_answer must contain
                    only A, B, C or D.
                    ",
                    provider: Lab::Groq,
                    model: self::MODEL,
                );


            $correctAnswer =
                strtoupper(
                    trim(
                        (string) (
                            $response[
                                'correct_answer'
                            ] ?? ''
                        )
                    )
                );


            if (
                !in_array(
                    $correctAnswer,
                    [
                        'A',
                        'B',
                        'C',
                        'D',
                    ],
                    true
                )
            ) {
                throw new RuntimeException(
                    'Groq returned an invalid correct answer.'
                );
            }


            return [
                'question' =>
                    trim(
                        (string) $response[
                            'question'
                        ]
                    ),

                'question_type' =>
                    'multiple_choice',

                'difficulty' =>
                    $difficulty,

                'options' => [
                    'A' =>
                        trim(
                            (string) $response[
                                'option_a'
                            ]
                        ),

                    'B' =>
                        trim(
                            (string) $response[
                                'option_b'
                            ]
                        ),

                    'C' =>
                        trim(
                            (string) $response[
                                'option_c'
                            ]
                        ),

                    'D' =>
                        trim(
                            (string) $response[
                                'option_d'
                            ]
                        ),
                ],

                'correct_answer' =>
                    $correctAnswer,

                'max_score' =>
                    $maxScore,
            ];
        }


        /*
        |--------------------------------------------------------------------------
        | Hard Question
        |--------------------------------------------------------------------------
        */

        $response =
            (
                new Interviewer()
            )->prompt(
                "
                Candidate position:
                {$positionName}

                Current question:
                {$order} of 10

                Difficulty:
                hard

                Previous questions:
                {$previousQuestions}

                Generate one advanced technical interview question.

                Requirements:

                - Require a detailed written answer.
                - Do not use A/B/C/D options.
                - Test professional understanding.
                - Keep it relevant to {$positionName}.
                - Do not repeat previous questions.
                ",
                provider: Lab::Groq,
                model: self::MODEL,
            );


        $question =
            trim(
                (string) $response
            );


        if ($question === '') {
            throw new RuntimeException(
                'Groq returned an empty hard question.'
            );
        }


        return [
            'question' =>
                $question,

            'question_type' =>
                'text',

            'difficulty' =>
                'hard',

            'options' =>
                null,

            'correct_answer' =>
                null,

            'max_score' =>
                20,
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | Evaluate Hard Answer
    |--------------------------------------------------------------------------
    */

    public function evaluateHardAnswer(
        Interview $interview,
        Answer $answer
    ): array {
        $interview->load(
            'position'
        );


        $answer->load(
            'question'
        );


        $positionName =
            $interview
                ->position
                ?->name;


        $question =
            $answer->question;


        if (!$positionName) {
            throw new RuntimeException(
                'Interview position not found.'
            );
        }


        if (!$question) {
            throw new RuntimeException(
                'Answer question not found.'
            );
        }


        $response =
            (
                new HardAnswerEvaluator()
            )->prompt(
                "
                Candidate position:
                {$positionName}

                Question:
                {$question->question}

                Candidate answer:
                {$answer->answer}

                Maximum score:
                {$question->max_score}

                Scoring guide:

                0-4:
                Incorrect or almost no understanding.

                5-8:
                Weak understanding.

                9-12:
                Basic or acceptable understanding.

                13-16:
                Good technical understanding.

                17-18:
                Very strong technical answer.

                19-20:
                Excellent professional-level answer.
                ",
                provider: Lab::Groq,
                model: self::MODEL,
            );


        $score =
            (int) (
                $response[
                    'score'
                ] ?? 0
            );


        /*
         * AI must never exceed
         * question max score.
         */
        $score =
            max(
                0,
                min(
                    $score,
                    $question
                        ->max_score
                )
            );


        $feedback =
            trim(
                (string) (
                    $response[
                        'feedback'
                    ]
                    ?? 'No feedback available.'
                )
            );


        return [
            'score' =>
                $score,

            'feedback' =>
                $feedback,
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | Final Score
    |--------------------------------------------------------------------------
    */

    public function calculateFinalScore(
        Interview $interview
    ): int {
        $interview->load(
            'questions.answer'
        );


        return (int) $interview
            ->questions
            ->sum(
                function (
                    $question
                ) {
                    return $question
                        ->answer
                        ?->score
                        ?? 0;
                }
            );
    }


    /*
    |--------------------------------------------------------------------------
    | Final Result
    |--------------------------------------------------------------------------
    */

    public function getResult(
        int $score
    ): string {
        if ($score < 50) {
            return 'weak';
        }


        if ($score < 75) {
            return 'medium';
        }


        return 'strong';
    }


    /*
    |--------------------------------------------------------------------------
    | Final AI Summary
    |--------------------------------------------------------------------------
    */

    public function generateFinalSummary(
        Interview $interview
    ): string {
        $interview->load([
            'position',
            'candidateProfile',
            'questions.answer',
        ]);


        $candidate =
            $interview
                ->candidateProfile;


        $positionName =
            $interview
                ->position
                ?->name;


        if (!$candidate) {
            throw new RuntimeException(
                'Candidate profile not found.'
            );
        }


        if (!$positionName) {
            throw new RuntimeException(
                'Interview position not found.'
            );
        }


        $answersText =
            $interview
                ->questions
                ->sortBy(
                    'order'
                )
                ->map(
                    function (
                        $question
                    ) {
                        $candidateAnswer =
                            $question
                                ->answer
                                ?->answer
                            ?? 'No answer';


                        $score =
                            $question
                                ->answer
                                ?->score
                            ?? 0;


                        $feedback =
                            $question
                                ->answer
                                ?->ai_feedback
                            ?? 'No AI feedback';


                        return <<<TEXT
Question {$question->order}:
{$question->question}

Difficulty:
{$question->difficulty}

Candidate answer:
{$candidateAnswer}

Score:
{$score} / {$question->max_score}

AI feedback:
{$feedback}
TEXT;
                    }
                )
                ->implode(
                    "\n\n"
                );


        $response =
            (
                new InterviewSummaryGenerator()
            )->prompt(
                "
                Candidate:
                {$candidate->name} {$candidate->surname}

                Position:
                {$positionName}

                Interview:

                {$answersText}
                ",
                provider: Lab::Groq,
                model: self::MODEL,
            );


        return trim(
            (string) $response
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Validate All 10 Questions
    |--------------------------------------------------------------------------
    */

    private function validateAndNormalizeQuestions(
        array $questions
    ): array {
        if (
            count(
                $questions
            ) !== 10
        ) {
            throw new RuntimeException(
                'Groq must return exactly 10 questions.'
            );
        }


        $normalized =
            [];


        $usedQuestions =
            [];


        foreach (
            $questions as $index => $question
        ) {
            if (!is_array($question)) {
                throw new RuntimeException(
                    'Invalid question structure.'
                );
            }


            /*
             * We control order ourselves.
             */
            $order =
                $index + 1;


            $questionText =
                trim(
                    (string) (
                        $question[
                            'question'
                        ] ?? ''
                    )
                );


            if ($questionText === '') {
                throw new RuntimeException(
                    "Question {$order} is empty."
                );
            }


            $normalizedQuestionText =
                mb_strtolower(
                    preg_replace(
                        '/\s+/',
                        ' ',
                        $questionText
                    )
                );


            if (
                in_array(
                    $normalizedQuestionText,
                    $usedQuestions,
                    true
                )
            ) {
                throw new RuntimeException(
                    "Question {$order} is duplicated."
                );
            }


            $usedQuestions[] =
                $normalizedQuestionText;


            $difficulty =
                $this->getDifficulty(
                    $order
                );


            $maxScore =
                $this->getMaxScore(
                    $order
                );


            /*
            |--------------------------------------------------------------------------
            | Questions 1-8
            |--------------------------------------------------------------------------
            */

            if ($order <= 8) {

                $optionA =
                    trim(
                        (string) (
                            $question[
                                'option_a'
                            ] ?? ''
                        )
                    );


                $optionB =
                    trim(
                        (string) (
                            $question[
                                'option_b'
                            ] ?? ''
                        )
                    );


                $optionC =
                    trim(
                        (string) (
                            $question[
                                'option_c'
                            ] ?? ''
                        )
                    );


                $optionD =
                    trim(
                        (string) (
                            $question[
                                'option_d'
                            ] ?? ''
                        )
                    );


                if (
                    $optionA === '' ||
                    $optionB === '' ||
                    $optionC === '' ||
                    $optionD === ''
                ) {
                    throw new RuntimeException(
                        "Question {$order} has invalid options."
                    );
                }


                $correctAnswer =
                    strtoupper(
                        trim(
                            (string) (
                                $question[
                                    'correct_answer'
                                ] ?? ''
                            )
                        )
                    );


                if (
                    !in_array(
                        $correctAnswer,
                        [
                            'A',
                            'B',
                            'C',
                            'D',
                        ],
                        true
                    )
                ) {
                    throw new RuntimeException(
                        "Question {$order} has invalid correct_answer."
                    );
                }


                $normalized[] = [
                    'order' =>
                        $order,

                    'question' =>
                        $questionText,

                    'question_type' =>
                        'multiple_choice',

                    'difficulty' =>
                        $difficulty,

                    'options' => [
                        'A' =>
                            $optionA,

                        'B' =>
                            $optionB,

                        'C' =>
                            $optionC,

                        'D' =>
                            $optionD,
                    ],

                    'correct_answer' =>
                        $correctAnswer,

                    'max_score' =>
                        $maxScore,
                ];


                continue;
            }


            /*
            |--------------------------------------------------------------------------
            | Questions 9-10
            |--------------------------------------------------------------------------
            */

            $normalized[] = [
                'order' =>
                    $order,

                'question' =>
                    $questionText,

                'question_type' =>
                    'text',

                'difficulty' =>
                    'hard',

                'options' =>
                    null,

                'correct_answer' =>
                    null,

                'max_score' =>
                    20,
            ];
        }


        return $normalized;
    }


    /*
    |--------------------------------------------------------------------------
    | Difficulty
    |--------------------------------------------------------------------------
    */

    private function getDifficulty(
        int $order
    ): string {
        if ($order <= 4) {
            return 'easy';
        }


        if ($order <= 8) {
            return 'medium';
        }


        return 'hard';
    }


    /*
    |--------------------------------------------------------------------------
    | Max Score
    |--------------------------------------------------------------------------
    */

    private function getMaxScore(
        int $order
    ): int {
        if ($order <= 4) {
            return 5;
        }


        if ($order <= 8) {
            return 10;
        }


        return 20;
    }
}