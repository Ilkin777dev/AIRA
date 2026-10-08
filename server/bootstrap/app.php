<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;


return Application::configure(
    basePath: dirname(__DIR__)
)
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',

        api: __DIR__ . '/../routes/api.php',

        commands: __DIR__ . '/../routes/console.php',

        health: '/up',
    )

    ->withMiddleware(
        function (Middleware $middleware): void {

            /*
            |--------------------------------------------------------------------------
            | ADMIN MIDDLEWARE
            |--------------------------------------------------------------------------
            */

            if (
                class_exists(
                    \App\Http\Middleware\AdminMiddleware::class
                )
            ) {

                $middleware->alias([
                    'admin' =>
                        \App\Http\Middleware\AdminMiddleware::class,
                ]);
            }


            /*
            |--------------------------------------------------------------------------
            | IMPORTANT
            |--------------------------------------------------------------------------
            |
            | statefulApi() НЕ используем.
            |
            | AIRA Desktop теперь работает через:
            |
            | Authorization: Bearer TOKEN
            |
            | Поэтому API остаётся stateless.
            |
            */
        }
    )

    ->withExceptions(
        function (Exceptions $exceptions): void {

            $exceptions->shouldRenderJsonWhen(
                fn (Request $request) =>
                    $request->is('api/*')
                    ||
                    $request->expectsJson()
            );
        }
    )

    ->create();