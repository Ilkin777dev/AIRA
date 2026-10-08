<?php

namespace App\Http\Controllers;

use App\Ai\Agents\CvAnalyzer;
use App\Models\CvAnalysis;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Ai\Enums\Lab;
use PhpOffice\PhpWord\IOFactory;
use RuntimeException;
use Smalot\PdfParser\Parser;
use Throwable;

class CvAnalysisController extends Controller
{
    private const AI_MODEL = 'openai/gpt-oss-20b';

    /*
    |--------------------------------------------------------------------------
    | ANALYZE CV
    |--------------------------------------------------------------------------
    */

    public function analyze(
        Request $request
    ): JsonResponse {
        $validatedData = $request->validate([
            'cv' => [
                'required',
                'file',
                'mimes:pdf,doc,docx',
                'max:10240',
            ],
        ]);

        $file = $validatedData['cv'];

        /*
        |--------------------------------------------------------------------------
        | SAVE CV
        |--------------------------------------------------------------------------
        */

        $uuid = (string) Str::uuid();

        $originalFileName =
            $file->getClientOriginalName();

        $extension =
            strtolower(
                $file->getClientOriginalExtension()
            );

        $filePath =
            $file->storeAs(
                'cv_uploads/' . $uuid,
                'cv.' . $extension,
                'local'
            );

        /*
        |--------------------------------------------------------------------------
        | CREATE CV ANALYSIS RECORD
        |--------------------------------------------------------------------------
        */

        $cvAnalysis =
            CvAnalysis::create([
                'uuid' =>
                    $uuid,

                'original_file_name' =>
                    $originalFileName,

                'file_path' =>
                    $filePath,

                'status' =>
                    'uploaded',
            ]);

        try {

            /*
            |--------------------------------------------------------------------------
            | EXTRACT CV TEXT
            |--------------------------------------------------------------------------
            */

            $absolutePath =
                Storage::disk('local')
                    ->path(
                        $filePath
                    );

            $cvText =
                $this->extractText(
                    $absolutePath,
                    $extension
                );

            $cvText =
                trim(
                    $cvText
                );

            if ($cvText === '') {
                throw new RuntimeException(
                    'CV text could not be extracted.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | LIMIT TEXT SIZE
            |--------------------------------------------------------------------------
            */

            $cvText =
                mb_substr(
                    $cvText,
                    0,
                    30000
                );

            /*
            |--------------------------------------------------------------------------
            | AI PROMPT
            |--------------------------------------------------------------------------
            */

            $prompt = <<<PROMPT
Analyze the following candidate CV.

Determine:

1. Technical skills.
2. Soft skills.
3. Candidate experience level.
4. Up to 3 most suitable professional positions.

The suggested positions must represent what the candidate appears qualified for based on the CV.

Do not limit suggested positions to a predefined database list.

If the CV demonstrates several possible career directions,
return the three most suitable professional titles.

Do not invent experience or skills that are not supported by the CV.

CV CONTENT:

{$cvText}
PROMPT;

            /*
            |--------------------------------------------------------------------------
            | GROQ
            |--------------------------------------------------------------------------
            */

            $response =
                (
                    new CvAnalyzer()
                )->prompt(
                    $prompt,
                    provider: Lab::Groq,
                    model: self::AI_MODEL,
                );

            /*
            |--------------------------------------------------------------------------
            | TECHNICAL SKILLS
            |--------------------------------------------------------------------------
            */

            $technicalSkills =
                collect(
                    $response[
                        'technical_skills'
                    ] ?? []
                )
                    ->filter(
                        fn ($skill) =>
                            is_string($skill)
                            && trim($skill) !== ''
                    )
                    ->map(
                        fn ($skill) =>
                            trim($skill)
                    )
                    ->unique()
                    ->values()
                    ->all();

            /*
            |--------------------------------------------------------------------------
            | SOFT SKILLS
            |--------------------------------------------------------------------------
            */

            $softSkills =
                collect(
                    $response[
                        'soft_skills'
                    ] ?? []
                )
                    ->filter(
                        fn ($skill) =>
                            is_string($skill)
                            && trim($skill) !== ''
                    )
                    ->map(
                        fn ($skill) =>
                            trim($skill)
                    )
                    ->unique()
                    ->values()
                    ->all();

            /*
            |--------------------------------------------------------------------------
            | EXPERIENCE LEVEL
            |--------------------------------------------------------------------------
            */

            $experienceLevel =
                strtolower(
                    trim(
                        (string) (
                            $response[
                                'experience_level'
                            ] ?? ''
                        )
                    )
                );

            if (
                !in_array(
                    $experienceLevel,
                    [
                        'junior',
                        'middle',
                        'senior',
                    ],
                    true
                )
            ) {
                $experienceLevel =
                    'middle';
            }

            /*
            |--------------------------------------------------------------------------
            | SUGGESTED POSITIONS
            |--------------------------------------------------------------------------
            */

            $suggestedPositions =
                collect(
                    $response[
                        'suggested_positions'
                    ] ?? []
                )
                    ->filter(
                        fn ($position) =>
                            is_string($position)
                            && trim($position) !== ''
                    )
                    ->map(
                        function ($position) {
                            return trim(
                                preg_replace(
                                    '/\s+/',
                                    ' ',
                                    $position
                                )
                            );
                        }
                    )
                    ->unique()
                    ->take(3)
                    ->values()
                    ->all();

            /*
            |--------------------------------------------------------------------------
            | SAVE AI ANALYSIS
            |--------------------------------------------------------------------------
            */

            $cvAnalysis->update([
                'technical_skills' =>
                    $technicalSkills,

                'soft_skills' =>
                    $softSkills,

                'suggested_positions' =>
                    $suggestedPositions,

                'experience_level' =>
                    $experienceLevel,

                'status' =>
                    'analyzed',
            ]);

            /*
            |--------------------------------------------------------------------------
            | RESPONSE
            |--------------------------------------------------------------------------
            */

            return response()->json([
                'message' =>
                    'CV analyzed successfully.',

                'cv_analysis' => [
                    'id' =>
                        $cvAnalysis->id,

                    'uuid' =>
                        $cvAnalysis->uuid,

                    'original_file_name' =>
                        $cvAnalysis
                            ->original_file_name,

                    'technical_skills' =>
                        $technicalSkills,

                    'soft_skills' =>
                        $softSkills,

                    'experience_level' =>
                        $experienceLevel,

                    'suggested_positions' =>
                        $suggestedPositions,

                    'selected_position' =>
                        null,
                ],
            ], 200);

        } catch (Throwable $error) {

            report(
                $error
            );

            $cvAnalysis->update([
                'status' =>
                    'failed',
            ]);

            return response()->json([
                'message' =>
                    'Failed to analyze CV.',

                'error' =>
                    $error->getMessage(),
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CONFIRM POSITION
    |--------------------------------------------------------------------------
    |
    | Пользователь может:
    |
    | 1. выбрать одну из suggested_positions
    | 2. ввести свою профессию вручную
    |
    */

    public function confirmPosition(
        Request $request,
        CvAnalysis $cvAnalysis
    ): JsonResponse {
        /*
         * Нельзя выбирать профессию,
         * если CV ещё нормально не проанализирован.
         */
        if (
            !in_array(
                $cvAnalysis->status,
                [
                    'analyzed',
                    'confirmed',
                ],
                true
            )
        ) {
            return response()->json([
                'message' =>
                    'CV must be analyzed before selecting a position.',
            ], 409);
        }

        $validatedData =
            $request->validate([
                'selected_position' => [
                    'required',
                    'string',
                    'min:2',
                    'max:100',
                ],
            ]);

        /*
        |--------------------------------------------------------------------------
        | NORMALIZE POSITION NAME
        |--------------------------------------------------------------------------
        */

        $selectedPosition =
            trim(
                preg_replace(
                    '/\s+/',
                    ' ',
                    $validatedData[
                        'selected_position'
                    ]
                )
            );

        if ($selectedPosition === '') {
            return response()->json([
                'message' =>
                    'Position cannot be empty.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | FIND EXISTING POSITION
        |--------------------------------------------------------------------------
        |
        | Ищем без учёта регистра:
        |
        | Product Owner
        | product owner
        | PRODUCT OWNER
        |
        | должны считаться одной профессией.
        |
        */

        $position =
            Position::query()
                ->whereRaw(
                    'LOWER(name) = ?',
                    [
                        mb_strtolower(
                            $selectedPosition
                        ),
                    ]
                )
                ->first();

        /*
        |--------------------------------------------------------------------------
        | CREATE POSITION
        |--------------------------------------------------------------------------
        |
        | Если такой профессии ещё нет,
        | создаём её.
        |
        */

        if (!$position) {
            $position =
                Position::create([
                    'name' =>
                        $selectedPosition,
                ]);
        }

        /*
        |--------------------------------------------------------------------------
        | SAVE SELECTION
        |--------------------------------------------------------------------------
        */

        $cvAnalysis->update([
            'selected_position' =>
                $position->name,

            'selected_position_id' =>
                $position->id,

            'status' =>
                'confirmed',
        ]);

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'message' =>
                'Position confirmed successfully.',

            'cv_analysis' => [
                'id' =>
                    $cvAnalysis->id,

                'uuid' =>
                    $cvAnalysis->uuid,

                'selected_position' => [
                    'id' =>
                        $position->id,

                    'name' =>
                        $position->name,
                ],

                'suggested_positions' =>
                    $cvAnalysis
                        ->suggested_positions,

                'status' =>
                    $cvAnalysis->status,
            ],
        ], 200);
    }


    /*
    |--------------------------------------------------------------------------
    | EXTRACT TEXT
    |--------------------------------------------------------------------------
    */

    private function extractText(
        string $filePath,
        string $extension
    ): string {
        return match ($extension) {

            'pdf' =>
                $this->extractPdfText(
                    $filePath
                ),

            'doc',
            'docx' =>
                $this->extractWordText(
                    $filePath
                ),

            default =>
                throw new RuntimeException(
                    'Unsupported CV file format.'
                ),
        };
    }


    /*
    |--------------------------------------------------------------------------
    | PDF
    |--------------------------------------------------------------------------
    */

    private function extractPdfText(
        string $filePath
    ): string {
        $parser =
            new Parser();

        $pdf =
            $parser->parseFile(
                $filePath
            );

        return trim(
            $pdf->getText()
        );
    }


    /*
    |--------------------------------------------------------------------------
    | WORD
    |--------------------------------------------------------------------------
    */

    private function extractWordText(
        string $filePath
    ): string {
        $phpWord =
            IOFactory::load(
                $filePath
            );

        $textParts =
            [];

        foreach (
            $phpWord->getSections()
            as $section
        ) {
            foreach (
                $section->getElements()
                as $element
            ) {
                $this->extractWordElementText(
                    $element,
                    $textParts
                );
            }
        }

        return trim(
            implode(
                "\n",
                $textParts
            )
        );
    }


    /*
    |--------------------------------------------------------------------------
    | WORD ELEMENT
    |--------------------------------------------------------------------------
    */

    private function extractWordElementText(
        mixed $element,
        array &$textParts
    ): void {
        if (
            method_exists(
                $element,
                'getText'
            )
        ) {
            $text =
                $element->getText();

            if (
                is_string($text)
                && trim($text) !== ''
            ) {
                $textParts[] =
                    trim($text);
            }
        }

        /*
         * TextRun и некоторые другие Word элементы
         * содержат вложенные elements.
         */
        if (
            method_exists(
                $element,
                'getElements'
            )
        ) {
            foreach (
                $element->getElements()
                as $childElement
            ) {
                $this->extractWordElementText(
                    $childElement,
                    $textParts
                );
            }
        }
    }
}