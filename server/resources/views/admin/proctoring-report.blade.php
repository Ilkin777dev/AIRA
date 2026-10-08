<!DOCTYPE html>
<html lang="az">
<head>
    <meta charset="UTF-8">

    <title>
        AIRA Proctoring Report
    </title>

    <style>
        @page {
            margin: 26px 30px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: "DejaVu Sans", sans-serif;
            font-size: 10px;
            color: #30303A;
            background: #FFFFFF;
        }

        .header {
            padding: 18px 20px;
            margin-bottom: 18px;
            color: #FFFFFF;
            background: #33375B;
            border-radius: 6px;
        }

        .brand {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 1px;
        }

        .brand-subtitle {
            margin-top: 4px;
            font-size: 9px;
            color: #E7E8F1;
        }

        .report-title {
            margin-top: 12px;
            font-size: 15px;
            font-weight: 700;
        }

        .section {
            margin-bottom: 16px;
        }

        .section-title {
            margin-bottom: 8px;
            padding-bottom: 5px;
            font-size: 12px;
            font-weight: 700;
            color: #33375B;
            border-bottom: 1px solid #DCDDE7;
        }

        .info-table,
        .events-table,
        .stats-table {
            width: 100%;
            border-collapse: collapse;
        }

        .info-table td {
            width: 50%;
            padding: 7px 9px;
            vertical-align: top;
            border: 1px solid #E3E4EA;
        }

        .info-label {
            display: block;
            margin-bottom: 3px;
            font-size: 8px;
            text-transform: uppercase;
            color: #8A8A94;
        }

        .info-value {
            font-size: 10px;
            font-weight: 700;
            color: #33343D;
        }

        .stats-table td {
            width: 33.333%;
            padding: 9px;
            vertical-align: top;
            border: 1px solid #E3E4EA;
        }

        .stat-label {
            font-size: 8px;
            color: #888892;
        }

        .stat-value {
            margin-top: 3px;
            font-size: 17px;
            font-weight: 700;
            color: #33375B;
        }

        .events-table th {
            padding: 7px 6px;
            font-size: 8px;
            text-align: left;
            text-transform: uppercase;
            color: #FFFFFF;
            background: #33375B;
            border: 1px solid #33375B;
        }

        .events-table td {
            padding: 7px 6px;
            vertical-align: top;
            border: 1px solid #E3E4EA;
        }

        .events-table tr:nth-child(even) td {
            background: #F8F8FA;
        }

        .event-type {
            font-weight: 700;
            color: #33375B;
        }

        .event-detail {
            word-break: break-word;
        }

        .process-list {
            columns: 3;
            column-gap: 18px;
            margin: 0;
            padding-left: 18px;
        }

        .process-list li {
            margin-bottom: 3px;
            break-inside: avoid;
        }

        .muted {
            color: #8C8C95;
        }

        .footer-note {
            margin-top: 18px;
            padding-top: 8px;
            font-size: 8px;
            text-align: center;
            color: #92929B;
            border-top: 1px solid #E2E2E8;
        }
    </style>
</head>

<body>

    <div class="header">
        <div class="brand">
            AIRA
        </div>

        <div class="brand-subtitle">
            Artificial Intelligence Recruitment Assessment
        </div>

        <div class="report-title">
            Exam Proctoring Report
        </div>
    </div>


    <div class="section">
        <div class="section-title">
            Namizəd və müsahibə məlumatları
        </div>

        <table class="info-table">
            <tr>
                <td>
                    <span class="info-label">
                        Namizəd
                    </span>

                    <span class="info-value">
                        {{ $candidate?->name ?? '-' }}
                        {{ $candidate?->surname ?? '' }}
                    </span>
                </td>

                <td>
                    <span class="info-label">
                        FIN kod
                    </span>

                    <span class="info-value">
                        {{ $candidate?->fin_code ?? '-' }}
                    </span>
                </td>
            </tr>

            <tr>
                <td>
                    <span class="info-label">
                        Email
                    </span>

                    <span class="info-value">
                        {{ $candidate?->user?->email ?? '-' }}
                    </span>
                </td>

                <td>
                    <span class="info-label">
                        Vəzifə
                    </span>

                    <span class="info-value">
                        {{ $candidate?->position?->name ?? '-' }}
                    </span>
                </td>
            </tr>

            <tr>
                <td>
                    <span class="info-label">
                        Interview ID
                    </span>

                    <span class="info-value">
                        {{ $interview->id }}
                    </span>
                </td>

                <td>
                    <span class="info-label">
                        Status
                    </span>

                    <span class="info-value">
                        {{ $interview->status ?? '-' }}
                    </span>
                </td>
            </tr>

            <tr>
                <td>
                    <span class="info-label">
                        Başlama vaxtı
                    </span>

                    <span class="info-value">
                        {{ $interview->started_at?->format('d.m.Y H:i:s') ?? '-' }}
                    </span>
                </td>

                <td>
                    <span class="info-label">
                        Bitmə vaxtı
                    </span>

                    <span class="info-value">
                        {{ $interview->finished_at?->format('d.m.Y H:i:s') ?? '-' }}
                    </span>
                </td>
            </tr>
        </table>
    </div>


    <div class="section">
        <div class="section-title">
            Exam Activity Summary
        </div>

        <table class="stats-table">
            <tr>
                <td>
                    <div class="stat-label">
                        Ümumi hadisələr
                    </div>

                    <div class="stat-value">
                        {{ $statistics['total_events'] }}
                    </div>
                </td>

                <td>
                    <div class="stat-label">
                        Blocked shortcuts
                    </div>

                    <div class="stat-value">
                        {{ $statistics['blocked_shortcuts'] }}
                    </div>
                </td>

                <td>
                    <div class="stat-label">
                        Focus losses
                    </div>

                    <div class="stat-value">
                        {{ $statistics['focus_losses'] }}
                    </div>
                </td>
            </tr>

            <tr>
                <td>
                    <div class="stat-label">
                        Fullscreen attempts
                    </div>

                    <div class="stat-value">
                        {{ $statistics['fullscreen_exit_attempts'] }}
                    </div>
                </td>

                <td>
                    <div class="stat-label">
                        Processes started
                    </div>

                    <div class="stat-value">
                        {{ $statistics['process_started'] }}
                    </div>
                </td>

                <td>
                    <div class="stat-label">
                        Processes stopped
                    </div>

                    <div class="stat-value">
                        {{ $statistics['process_stopped'] }}
                    </div>
                </td>
            </tr>
        </table>
    </div>


    <div class="section">
        <div class="section-title">
            Activity Log
        </div>

        @if ($events->isEmpty())
            <div class="muted">
                Proctoring hadisələri mövcud deyil.
            </div>
        @else
            <table class="events-table">
                <thead>
                    <tr>
                        <th style="width: 22%;">
                            Vaxt
                        </th>

                        <th style="width: 28%;">
                            Hadisə
                        </th>

                        <th style="width: 50%;">
                            Detal
                        </th>
                    </tr>
                </thead>

                <tbody>
                    @foreach ($events as $event)
                        @php
                            $data = $event->event_data ?? [];

                            $detail = '';

                            if ($event->event_type === 'blocked_shortcut') {
                                $detail = $data['shortcut'] ?? '';
                            }

                            if (
                                $event->event_type === 'process_started' ||
                                $event->event_type === 'process_stopped'
                            ) {
                                $detail = $data['process'] ?? '';
                            }

                            if ($event->event_type === 'proctoring_started') {
                                $count = $data['initial_process_count'] ?? null;

                                if ($count !== null) {
                                    $detail = $count . ' processes';
                                }
                            }
                        @endphp

                        <tr>
                            <td>
                                {{ $event->occurred_at?->format('d.m.Y H:i:s') ?? '-' }}
                            </td>

                            <td class="event-type">
                                {{ strtoupper(str_replace('_', ' ', $event->event_type)) }}
                            </td>

                            <td class="event-detail">
                                {{ $detail !== '' ? $detail : '-' }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>


    <div class="section">
        <div class="section-title">
            İlkin işləyən proseslər
        </div>

        @if ($initialProcesses->isEmpty())
            <div class="muted">
                İlkin proses siyahısı mövcud deyil.
            </div>
        @else
            <ul class="process-list">
                @foreach ($initialProcesses as $process)
                    <li>
                        {{ $process }}
                    </li>
                @endforeach
            </ul>
        @endif
    </div>


    <div class="footer-note">
        AIRA — Artificial Intelligence Recruitment Assessment
    </div>

</body>
</html>
