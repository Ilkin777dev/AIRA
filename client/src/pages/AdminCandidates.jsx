import {
  Fragment,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/axios";

import bgImage from "../assets/main_bg.png";
import AIRA_Logo_White from "../assets/AIRA-Logo-White.png";


function AdminCandidates() {
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState([]);

  const [statistics, setStatistics] = useState({
    total_candidates: 0,
    completed_interviews: 0,
    strong: 0,
    medium: 0,
    weak: 0,
  });

  const [positions, setPositions] = useState([]);

  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [
    expandedCandidateId,
    setExpandedCandidateId,
  ] = useState(null);

  const [
    candidateDetails,
    setCandidateDetails,
  ] = useState({});

  const [recordings, setRecordings] = useState({});

  const [
    recordingLoading,
    setRecordingLoading,
  ] = useState({});

  const [videoUrls, setVideoUrls] = useState({});

  const [
    videoLoading,
    setVideoLoading,
  ] = useState({});

  const [
    recordingErrors,
    setRecordingErrors,
  ] = useState({});

  const videoUrlsRef = useRef({});

  const [
    proctoringData,
    setProctoringData,
  ] = useState({});

  const [
    proctoringLoading,
    setProctoringLoading,
  ] = useState({});

  const [
    proctoringErrors,
    setProctoringErrors,
  ] = useState({});

  const [
    expandedProctoring,
    setExpandedProctoring,
  ] = useState({});

  const [
    reportDownloading,
    setReportDownloading,
  ] = useState({});

  const [error, setError] = useState("");


  useEffect(() => {
    return () => {
      Object
        .values(videoUrlsRef.current)
        .forEach((url) => {
          if (url) {
            URL.revokeObjectURL(url);
          }
        });
    };
  }, []);


  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await api.get(
          "/api/admin/dashboard"
        );

        setStatistics(
          response.data.statistics || {
            total_candidates: 0,
            completed_interviews: 0,
            strong: 0,
            medium: 0,
            weak: 0,
          }
        );
      } catch (requestError) {
        console.error(
          "STATISTICS ERROR:",
          requestError
        );

        setError(
          requestError?.response?.data?.message ||
            "Dashboard məlumatlarını yükləmək mümkün olmadı."
        );
      }
    };

    fetchStatistics();
  }, []);


  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const response = await api.get(
          "/api/positions"
        );

        setPositions(
          response.data.positions || []
        );
      } catch (requestError) {
        console.error(
          "POSITIONS ERROR:",
          requestError
        );

        setPositions([]);
      }
    };

    fetchPositions();
  }, []);


  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setError("");

        const response = await api.get(
          "/api/admin/candidates",
          {
            params: {
              search,
              result: resultFilter,
              status: statusFilter,
              position_id: positionFilter,
              date: dateFilter,
            },
          }
        );

        setCandidates(
          response.data.candidates || []
        );
      } catch (requestError) {
        console.error(
          "CANDIDATES ERROR:",
          requestError
        );

        setError(
          requestError?.response?.data?.message ||
            "Namizədləri yükləmək mümkün olmadı."
        );
      }
    };

    fetchCandidates();
  }, [
    search,
    resultFilter,
    statusFilter,
    positionFilter,
    dateFilter,
  ]);


  const loadRecording = async (
    interviewId
  ) => {
    if (!interviewId) {
      return;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        recordings,
        interviewId
      )
    ) {
      return;
    }

    try {
      setRecordingLoading((previous) => ({
        ...previous,
        [interviewId]: true,
      }));

      setRecordingErrors((previous) => ({
        ...previous,
        [interviewId]: "",
      }));

      const response = await api.get(
        `/api/admin/interviews/${interviewId}/recording`
      );

      setRecordings((previous) => ({
        ...previous,
        [interviewId]:
          response.data.recording,
      }));
    } catch (requestError) {
      console.error(
        "RECORDING ERROR:",
        requestError
      );

      setRecordingErrors((previous) => ({
        ...previous,
        [interviewId]:
          requestError?.response?.data?.message ||
          "Recording məlumatlarını yükləmək mümkün olmadı.",
      }));
    } finally {
      setRecordingLoading((previous) => ({
        ...previous,
        [interviewId]: false,
      }));
    }
  };


  const loadRecordingVideo = async (
    interviewId,
    recordingId
  ) => {
    if (
      !interviewId ||
      !recordingId
    ) {
      return;
    }

    if (videoUrls[interviewId]) {
      return;
    }

    try {
      setVideoLoading((previous) => ({
        ...previous,
        [interviewId]: true,
      }));

      setRecordingErrors((previous) => ({
        ...previous,
        [interviewId]: "",
      }));

      const response = await api.get(
        `/api/admin/interview-recordings/${recordingId}/video`,
        {
          responseType: "blob",
        }
      );

      const objectUrl =
        URL.createObjectURL(
          response.data
        );

      const oldUrl =
        videoUrlsRef.current[
          interviewId
        ];

      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }

      videoUrlsRef.current[
        interviewId
      ] = objectUrl;

      setVideoUrls((previous) => ({
        ...previous,
        [interviewId]: objectUrl,
      }));
    } catch (requestError) {
      console.error(
        "VIDEO ERROR:",
        requestError
      );

      setRecordingErrors((previous) => ({
        ...previous,
        [interviewId]:
          requestError?.response?.data?.message ||
          "Interview videosunu yükləmək mümkün olmadı.",
      }));
    } finally {
      setVideoLoading((previous) => ({
        ...previous,
        [interviewId]: false,
      }));
    }
  };


  const loadProctoring = async (
    interviewId
  ) => {
    if (!interviewId) {
      return;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        proctoringData,
        interviewId
      )
    ) {
      return;
    }

    try {
      setProctoringLoading(
        (previous) => ({
          ...previous,
          [interviewId]: true,
        })
      );

      setProctoringErrors(
        (previous) => ({
          ...previous,
          [interviewId]: "",
        })
      );

      const response =
        await api.get(
          `/api/admin/interviews/${interviewId}/proctoring`
        );

      setProctoringData(
        (previous) => ({
          ...previous,
          [interviewId]:
            response.data,
        })
      );
    } catch (requestError) {
      console.error(
        "PROCTORING ERROR:",
        requestError
      );

      setProctoringErrors(
        (previous) => ({
          ...previous,
          [interviewId]:
            requestError
              ?.response
              ?.data
              ?.message ||
            "Proctoring məlumatlarını yükləmək mümkün olmadı.",
        })
      );
    } finally {
      setProctoringLoading(
        (previous) => ({
          ...previous,
          [interviewId]: false,
        })
      );
    }
  };


  const handleToggleProctoring =
    async (
      interviewId
    ) => {
      if (!interviewId) {
        return;
      }

      if (
        !proctoringData[
          interviewId
        ]
      ) {
        await loadProctoring(
          interviewId
        );
      }

      setExpandedProctoring(
        (previous) => ({
          ...previous,
          [interviewId]:
            !previous[
              interviewId
            ],
        })
      );
    };


  const downloadProctoringReport =
    async (
      interviewId
    ) => {
      if (!interviewId) {
        return;
      }

      try {
        setReportDownloading(
          (previous) => ({
            ...previous,
            [interviewId]: true,
          })
        );

        setProctoringErrors(
          (previous) => ({
            ...previous,
            [interviewId]: "",
          })
        );

        const response =
          await api.get(
            `/api/admin/interviews/${interviewId}/proctoring/report`,
            {
              responseType:
                "blob",
            }
          );

        const blob =
          new Blob(
            [
              response.data,
            ],
            {
              type:
                "application/pdf",
            }
          );

        const objectUrl =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href =
          objectUrl;

        link.download =
          `aira-proctoring-interview-${interviewId}.pdf`;

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
          objectUrl
        );
      } catch (requestError) {
        console.error(
          "PROCTORING PDF ERROR:",
          requestError
        );

        setProctoringErrors(
          (previous) => ({
            ...previous,
            [interviewId]:
              requestError
                ?.response
                ?.data
                ?.message ||
              "Proctoring PDF report-u yükləmək mümkün olmadı.",
          })
        );
      } finally {
        setReportDownloading(
          (previous) => ({
            ...previous,
            [interviewId]: false,
          })
        );
      }
    };


  const handleToggleCandidate = async (
    candidateId
  ) => {
    if (
      expandedCandidateId ===
      candidateId
    ) {
      setExpandedCandidateId(null);
      return;
    }

    try {
      setError("");

      let details =
        candidateDetails[
          candidateId
        ];

      if (!details) {
        const response = await api.get(
          `/api/admin/candidates/${candidateId}`
        );

        details = response.data;

        setCandidateDetails(
          (previous) => ({
            ...previous,
            [candidateId]:
              details,
          })
        );
      }

      setExpandedCandidateId(
        candidateId
      );

      if (
        details?.interview?.id
      ) {
        await Promise.all([
          loadRecording(
            details.interview.id
          ),
          loadProctoring(
            details.interview.id
          ),
        ]);
      }
    } catch (requestError) {
      console.error(
        "DETAILS ERROR:",
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
          "Namizəd məlumatlarını yükləmək mümkün olmadı."
      );
    }
  };


  const handleLogout = async () => {
    try {
      setError("");

      await api.post(
        "/api/logout"
      );

      navigate(
        "/login",
        {
          replace: true,
        }
      );
    } catch (requestError) {
      console.error(
        "LOGOUT ERROR:",
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
          "Sistemdən çıxmaq mümkün olmadı."
      );
    }
  };


  const handleResetFilters = () => {
    setSearch("");
    setResultFilter("");
    setStatusFilter("");
    setPositionFilter("");
    setDateFilter("");
  };


  const formatDuration = (
    totalSeconds
  ) => {
    if (
      totalSeconds === null ||
      totalSeconds === undefined
    ) {
      return "-";
    }

    const seconds =
      Number(totalSeconds);

    if (
      Number.isNaN(seconds)
    ) {
      return "-";
    }

    const hours =
      Math.floor(
        seconds / 3600
      );

    const minutes =
      Math.floor(
        (seconds % 3600) / 60
      );

    const remainingSeconds =
      Math.floor(
        seconds % 60
      );

    if (hours > 0) {
      return `${hours}:${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        remainingSeconds
      ).padStart(
        2,
        "0"
      )}`;
    }

    return `${minutes}:${String(
      remainingSeconds
    ).padStart(
      2,
      "0"
    )}`;
  };


  const formatFileSize = (
    bytes
  ) => {
    if (
      bytes === null ||
      bytes === undefined
    ) {
      return "-";
    }

    const size =
      Number(bytes);

    if (
      Number.isNaN(size)
    ) {
      return "-";
    }

    if (size === 0) {
      return "0 MB";
    }

    const megabytes =
      size /
      (1024 * 1024);

    if (
      megabytes < 1024
    ) {
      return `${megabytes.toFixed(
        2
      )} MB`;
    }

    const gigabytes =
      megabytes / 1024;

    return `${gigabytes.toFixed(
      2
    )} GB`;
  };


  const formatDate = (
    value
  ) => {
    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      "az-AZ",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };


  return (
    <main
      className="
        h-screen
        overflow-hidden
        bg-cover
        bg-center
        font-archivo
        text-[#30303A]
      "
      style={{
        backgroundImage:
          `url(${bgImage})`,
      }}
    >
      <div
        className="
          flex
          h-full
          flex-col
          bg-[#11142B]/45
          px-[24px]
          pb-[24px]
          pt-[24px]
        "
      >
        <div
          className="
            mx-auto
            flex
            h-full
            min-h-0
            w-full
            max-w-[1450px]
            flex-col
          "
        >
          <header
            className="
              mb-[14px]
              flex
              shrink-0
              items-center
              justify-between
            "
          >
            <div className="flex items-center">
              <img
                src={
                  AIRA_Logo_White
                }
                alt="AIRA"
                className="w-[250px]"
              />
            </div>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="
                flex
                cursor-pointer
                items-center
                gap-[8px]
                rounded-[5px]
                border
                border-white/30
                bg-white/10
                px-[16px]
                py-[9px]
                text-[12px]
                font-medium
                text-white
                backdrop-blur-sm
                transition
                hover:bg-white
                hover:text-[#33375B]
              "
            >
              <LogoutIcon />
              Çıxış
            </button>
          </header>


          {error && (
            <div
              className="
                mb-[10px]
                shrink-0
                rounded-[6px]
                border
                border-[#F4CACA]
                bg-[#FFF4F4]
                px-[16px]
                py-[10px]
                text-[12px]
                text-[#B24747]
              "
            >
              {error}
            </div>
          )}


          <section
            className="
              mb-[10px]
              shrink-0
              rounded-[8px]
              bg-white
              px-[22px]
              py-[14px]
            "
          >
            <h1
              className="
                font-chakra
                text-[27px]
                font-medium
                text-[#33375B]
              "
            >
              Admin Dashboard
            </h1>

            <p
              className="
                mt-[3px]
                text-[12px]
                text-[#7C7C86]
              "
            >
              Namizədləri, müsahibə nəticələrini və recording məlumatlarını idarə edin.
            </p>
          </section>


          <section
            className="
              mb-[10px]
              grid
              shrink-0
              grid-cols-5
              gap-[10px]
            "
          >
            <StatisticCard
              title="Ümumi namizədlər"
              value={
                statistics.total_candidates
              }
            />

            <StatisticCard
              title="Tamamlanmış"
              value={
                statistics.completed_interviews
              }
            />

            <StatisticCard
              title="Strong"
              value={
                statistics.strong
              }
              type="strong"
            />

            <StatisticCard
              title="Medium"
              value={
                statistics.medium
              }
              type="medium"
            />

            <StatisticCard
              title="Weak"
              value={
                statistics.weak
              }
              type="weak"
            />
          </section>


          <section
            className="
              mb-[10px]
              shrink-0
              rounded-[8px]
              bg-white
              p-[14px]
            "
          >
            <div
              className="
                mb-[10px]
                flex
                items-center
                justify-between
              "
            >
              <h2
                className="
                  font-chakra
                  text-[17px]
                  font-medium
                  text-[#33375B]
                "
              >
                Filtrlər
              </h2>

              <button
                type="button"
                onClick={
                  handleResetFilters
                }
                className="
                  cursor-pointer
                  rounded-[4px]
                  border
                  border-[#DDDEE5]
                  px-[13px]
                  py-[7px]
                  text-[12px]
                  text-[#666671]
                  transition
                  hover:border-[#33375B]
                  hover:text-[#33375B]
                "
              >
                Filtrləri sıfırla
              </button>
            </div>

            <div
              className="
                grid
                grid-cols-[2fr_1fr_1fr_1.4fr_1fr]
                gap-[10px]
              "
            >
              <FilterInput
                type="text"
                placeholder="Ad və ya soyad üzrə axtarış..."
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

              <FilterSelect
                value={
                  resultFilter
                }
                onChange={(
                  event
                ) =>
                  setResultFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Bütün nəticələr
                </option>
                <option value="strong">
                  Strong
                </option>
                <option value="medium">
                  Medium
                </option>
                <option value="weak">
                  Weak
                </option>
              </FilterSelect>

              <FilterSelect
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Bütün statuslar
                </option>
                <option value="completed">
                  Completed
                </option>
                <option value="in_progress">
                  In Progress
                </option>
              </FilterSelect>

              <FilterSelect
                value={
                  positionFilter
                }
                onChange={(
                  event
                ) =>
                  setPositionFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Bütün vəzifələr
                </option>

                {positions.map(
                  (position) => (
                    <option
                      key={
                        position.id
                      }
                      value={
                        position.id
                      }
                    >
                      {
                        position.name
                      }
                    </option>
                  )
                )}
              </FilterSelect>

              <FilterInput
                type="date"
                value={
                  dateFilter
                }
                onChange={(
                  event
                ) =>
                  setDateFilter(
                    event.target.value
                  )
                }
              />
            </div>
          </section>


          <section
            className="
              flex
              min-h-0
              flex-1
              flex-col
              overflow-hidden
              rounded-[8px]
              bg-white
            "
          >
            <div
              className="
                shrink-0
                border-b
                border-[#ECECF0]
                px-[22px]
                py-[13px]
              "
            >
              <h2
                className="
                  font-chakra
                  text-[18px]
                  font-medium
                  text-[#33375B]
                "
              >
                Namizədlər
              </h2>
            </div>

            <div
              className="
                min-h-0
                flex-1
                overflow-auto
              "
            >
              <table
                className="
                  w-full
                  min-w-[1150px]
                  border-collapse
                "
              >
                <thead
                  className="
                    sticky
                    top-0
                    z-20
                    bg-[#F6F6F9]
                  "
                >
                  <tr
                    className="
                      text-left
                      text-[12px]
                      font-semibold
                      uppercase
                      tracking-[0.03em]
                      text-[#777783]
                    "
                  >
                    <TableHeader>Ad</TableHeader>
                    <TableHeader>Soyad</TableHeader>
                    <TableHeader>Email</TableHeader>
                    <TableHeader>Vəzifə</TableHeader>
                    <TableHeader>Bal</TableHeader>
                    <TableHeader>Nəticə</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Bitmə tarixi</TableHeader>
                    <TableHeader>Ətraflı</TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {candidates.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="
                          py-[60px]
                          text-center
                          text-[13px]
                          text-[#8C8C95]
                        "
                      >
                        Namizəd tapılmadı.
                      </td>
                    </tr>
                  ) : (
                    candidates.map(
                      (
                        candidate
                      ) => {
                        const details =
                          candidateDetails[
                            candidate.id
                          ];

                        const isExpanded =
                          expandedCandidateId ===
                          candidate.id;

                        const interviewId =
                          details
                            ?.interview
                            ?.id;

                        const recording =
                          interviewId
                            ? recordings[
                                interviewId
                              ]
                            : null;

                        const recordingIsLoading =
                          Boolean(
                            recordingLoading[
                              interviewId
                            ]
                          );

                        const videoIsLoading =
                          Boolean(
                            videoLoading[
                              interviewId
                            ]
                          );

                        const videoUrl =
                          videoUrls[
                            interviewId
                          ];

                        const recordingError =
                          recordingErrors[
                            interviewId
                          ];

                        const proctoring =
                          interviewId
                            ? proctoringData[
                                interviewId
                              ]
                            : null;

                        const proctoringIsLoading =
                          Boolean(
                            proctoringLoading[
                              interviewId
                            ]
                          );

                        const proctoringError =
                          proctoringErrors[
                            interviewId
                          ];

                        const proctoringIsExpanded =
                          Boolean(
                            expandedProctoring[
                              interviewId
                            ]
                          );

                        const reportIsDownloading =
                          Boolean(
                            reportDownloading[
                              interviewId
                            ]
                          );

                        return (
                          <Fragment
                            key={
                              candidate.id
                            }
                          >
                            <tr
                              className="
                                border-t
                                border-[#EEEEF2]
                                text-[13px]
                                transition
                                hover:bg-[#FAFAFC]
                              "
                            >
                              <TableCell strong>
                                {
                                  candidate.name
                                }
                              </TableCell>

                              <TableCell>
                                {
                                  candidate.surname ||
                                  "-"
                                }
                              </TableCell>

                              <TableCell>
                                {
                                  candidate.email ||
                                  "-"
                                }
                              </TableCell>

                              <TableCell>
                                {
                                  candidate.position ||
                                  "-"
                                }
                              </TableCell>

                              <TableCell>
                                {candidate.score !==
                                  null &&
                                candidate.score !==
                                  undefined
                                  ? `${candidate.score}%`
                                  : "-"}
                              </TableCell>

                              <TableCell>
                                <ResultBadge
                                  result={
                                    candidate.result
                                  }
                                />
                              </TableCell>

                              <TableCell>
                                <StatusBadge
                                  status={
                                    candidate.status
                                  }
                                />
                              </TableCell>

                              <TableCell>
                                {
                                  formatDate(
                                    candidate.finished_at
                                  )
                                }
                              </TableCell>

                              <TableCell>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleCandidate(
                                      candidate.id
                                    )
                                  }
                                  className="
                                    cursor-pointer
                                    rounded-[4px]
                                    bg-[#33375B]
                                    px-[13px]
                                    py-[7px]
                                    text-[12px]
                                    font-medium
                                    text-white
                                    transition
                                    hover:bg-[#292D4E]
                                  "
                                >
                                  {isExpanded
                                    ? "Bağla"
                                    : "Ətraflı bax"}
                                </button>
                              </TableCell>
                            </tr>


                            {isExpanded &&
                              details && (
                                <tr
                                  className="
                                    border-t
                                    border-[#E6E6EC]
                                  "
                                >
                                  <td
                                    colSpan="9"
                                    className="
                                      bg-[#F7F7FA]
                                      p-[20px]
                                    "
                                  >
                                    <div
                                      className="
                                        rounded-[7px]
                                        bg-white
                                        p-[20px]
                                      "
                                    >
                                      <h2
                                        className="
                                          mb-[16px]
                                          font-chakra
                                          text-[22px]
                                          font-medium
                                          text-[#33375B]
                                        "
                                      >
                                        Namizəd haqqında
                                      </h2>

                                      <div
                                        className="
                                          mb-[18px]
                                          grid
                                          grid-cols-3
                                          gap-[10px]
                                        "
                                      >
                                        <InfoBox
                                          label="Ad"
                                          value={
                                            details.candidate.name
                                          }
                                        />

                                        <InfoBox
                                          label="Soyad"
                                          value={
                                            details.candidate.surname
                                          }
                                        />

                                        <InfoBox
                                          label="Ata adı"
                                          value={
                                            details.candidate.patronymic
                                          }
                                        />

                                        <InfoBox
                                          label="FIN kod"
                                          value={
                                            details.candidate.fin_code
                                          }
                                        />

                                        <InfoBox
                                          label="Email"
                                          value={
                                            details.candidate.email
                                          }
                                        />

                                        <InfoBox
                                          label="Telefon"
                                          value={
                                            details.candidate.phone
                                          }
                                        />

                                        <InfoBox
                                          label="Vəzifə"
                                          value={
                                            details.candidate.position
                                          }
                                        />
                                      </div>


                                      {details.interview ? (
                                        <>
                                          <SectionTitle>
                                            Müsahibə nəticəsi
                                          </SectionTitle>

                                          <div
                                            className="
                                              mb-[18px]
                                              grid
                                              grid-cols-3
                                              gap-[10px]
                                            "
                                          >
                                            <InfoBox
                                              label="Status"
                                              value={
                                                details.interview.status
                                              }
                                            />

                                            <InfoBox
                                              label="Bal"
                                              value={
                                                details.interview.score !==
                                                  null &&
                                                details.interview.score !==
                                                  undefined
                                                  ? `${details.interview.score}%`
                                                  : "-"
                                              }
                                            />

                                            <InfoBox
                                              label="Nəticə"
                                              value={
                                                details.interview.result ||
                                                "-"
                                              }
                                            />
                                          </div>


                                          <SectionTitle>
                                            AI Summary
                                          </SectionTitle>

                                          <div
                                            className="
                                              mb-[18px]
                                              rounded-[6px]
                                              border
                                              border-[#E8E8EE]
                                              bg-[#FAFAFC]
                                              p-[15px]
                                              text-[13px]
                                              leading-[1.7]
                                              text-[#55555F]
                                            "
                                          >
                                            {
                                              details.interview.ai_summary ||
                                              "AI summary hələ mövcud deyil."
                                            }
                                          </div>


                                          <SectionTitle>
                                            Interview Recording
                                          </SectionTitle>

                                          <div
                                            className="
                                              mb-[22px]
                                              rounded-[7px]
                                              border
                                              border-[#E5E5EB]
                                              bg-[#FAFAFC]
                                              p-[17px]
                                            "
                                          >
                                            {recordingIsLoading && (
                                              <p
                                                className="
                                                  text-[12px]
                                                  text-[#777780]
                                                "
                                              >
                                                Recording məlumatları yüklənir...
                                              </p>
                                            )}

                                            {!recordingIsLoading &&
                                              !recording && (
                                                <p
                                                  className="
                                                    text-[12px]
                                                    text-[#777780]
                                                  "
                                                >
                                                  Bu müsahibə üçün recording mövcud deyil.
                                                </p>
                                              )}

                                            {recording && (
                                              <>
                                                <div
                                                  className="
                                                    mb-[15px]
                                                    grid
                                                    grid-cols-4
                                                    gap-[10px]
                                                  "
                                                >
                                                  <MiniInfo
                                                    label="Recording ID"
                                                    value={
                                                      recording.id
                                                    }
                                                  />

                                                  <MiniInfo
                                                    label="Status"
                                                    value={
                                                      recording.status
                                                    }
                                                  />

                                                  <MiniInfo
                                                    label="Müddət"
                                                    value={
                                                      formatDuration(
                                                        recording.duration_seconds
                                                      )
                                                    }
                                                  />

                                                  <MiniInfo
                                                    label="Fayl ölçüsü"
                                                    value={
                                                      formatFileSize(
                                                        recording.file_size
                                                      )
                                                    }
                                                  />
                                                </div>

                                                {recordingError && (
                                                  <div
                                                    className="
                                                      mb-[14px]
                                                      rounded-[4px]
                                                      border
                                                      border-[#F0D4D4]
                                                      bg-[#FFF6F6]
                                                      px-[12px]
                                                      py-[9px]
                                                      text-[12px]
                                                      text-[#B24747]
                                                    "
                                                  >
                                                    {
                                                      recordingError
                                                    }
                                                  </div>
                                                )}

                                                {recording.status ===
                                                  "completed" &&
                                                  recording.has_video &&
                                                  !videoUrl && (
                                                    <button
                                                      type="button"
                                                      disabled={
                                                        videoIsLoading
                                                      }
                                                      onClick={() =>
                                                        loadRecordingVideo(
                                                          interviewId,
                                                          recording.id
                                                        )
                                                      }
                                                      className="
                                                        cursor-pointer
                                                        rounded-[4px]
                                                        bg-[#33375B]
                                                        px-[16px]
                                                        py-[9px]
                                                        text-[12px]
                                                        font-medium
                                                        text-white
                                                        transition
                                                        hover:bg-[#292D4E]
                                                        disabled:cursor-not-allowed
                                                        disabled:opacity-50
                                                      "
                                                    >
                                                      {videoIsLoading
                                                        ? "Recording yüklənir..."
                                                        : "Recording-ə bax"}
                                                    </button>
                                                  )}

                                                {videoUrl && (
                                                  <div
                                                    className="
                                                      mt-[15px]
                                                      overflow-hidden
                                                      rounded-[7px]
                                                      bg-black
                                                    "
                                                  >
                                                    <video
                                                      src={
                                                        videoUrl
                                                      }
                                                      controls
                                                      preload="metadata"
                                                      className="
                                                        aspect-video
                                                        w-full
                                                        bg-black
                                                        object-contain
                                                      "
                                                    >
                                                      Your browser does not support video playback.
                                                    </video>
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>


                                          <SectionTitle>
                                            Exam Activity
                                          </SectionTitle>

                                          <div
                                            className="
                                              mb-[22px]
                                              rounded-[7px]
                                              border
                                              border-[#E5E5EB]
                                              bg-[#FAFAFC]
                                              p-[17px]
                                            "
                                          >
                                            {proctoringIsLoading && (
                                              <p
                                                className="
                                                  text-[12px]
                                                  text-[#777780]
                                                "
                                              >
                                                Exam activity məlumatları yüklənir...
                                              </p>
                                            )}

                                            {!proctoringIsLoading &&
                                              proctoring && (
                                                <>
                                                  <div
                                                    className="
                                                      grid
                                                      grid-cols-3
                                                      gap-[10px]
                                                    "
                                                  >
                                                    <ProctoringStat
                                                      label="Ümumi hadisələr"
                                                      value={
                                                        proctoring.statistics?.total_events ??
                                                        0
                                                      }
                                                    />

                                                    <ProctoringStat
                                                      label="Blocked shortcuts"
                                                      value={
                                                        proctoring.statistics?.blocked_shortcuts ??
                                                        0
                                                      }
                                                      type="warning"
                                                    />

                                                    <ProctoringStat
                                                      label="Focus losses"
                                                      value={
                                                        proctoring.statistics?.focus_losses ??
                                                        0
                                                      }
                                                      type="warning"
                                                    />

                                                    <ProctoringStat
                                                      label="Fullscreen attempts"
                                                      value={
                                                        proctoring.statistics?.fullscreen_exit_attempts ??
                                                        0
                                                      }
                                                      type="danger"
                                                    />

                                                    <ProctoringStat
                                                      label="Processes started"
                                                      value={
                                                        proctoring.statistics?.process_started ??
                                                        0
                                                      }
                                                      type="process"
                                                    />

                                                    <ProctoringStat
                                                      label="Processes stopped"
                                                      value={
                                                        proctoring.statistics?.process_stopped ??
                                                        0
                                                      }
                                                    />
                                                  </div>

                                                  <div
                                                    className="
                                                      mt-[15px]
                                                      flex
                                                      flex-wrap
                                                      gap-[8px]
                                                    "
                                                  >
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleToggleProctoring(
                                                          interviewId
                                                        )
                                                      }
                                                      className="
                                                        cursor-pointer
                                                        rounded-[4px]
                                                        bg-[#33375B]
                                                        px-[16px]
                                                        py-[9px]
                                                        text-[12px]
                                                        font-medium
                                                        text-white
                                                        transition
                                                        hover:bg-[#292D4E]
                                                      "
                                                    >
                                                      {proctoringIsExpanded
                                                        ? "Activity-ni bağla"
                                                        : "Activity-yə bax"}
                                                    </button>

                                                    <button
                                                      type="button"
                                                      disabled={
                                                        reportIsDownloading
                                                      }
                                                      onClick={() =>
                                                        downloadProctoringReport(
                                                          interviewId
                                                        )
                                                      }
                                                      className="
                                                        cursor-pointer
                                                        rounded-[4px]
                                                        border
                                                        border-[#33375B]
                                                        bg-white
                                                        px-[16px]
                                                        py-[9px]
                                                        text-[12px]
                                                        font-medium
                                                        text-[#33375B]
                                                        transition
                                                        hover:bg-[#33375B]
                                                        hover:text-white
                                                        disabled:cursor-not-allowed
                                                        disabled:opacity-50
                                                      "
                                                    >
                                                      {reportIsDownloading
                                                        ? "PDF hazırlanır..."
                                                        : "PDF yüklə"}
                                                    </button>
                                                  </div>

                                                  {proctoringError && (
                                                    <div
                                                      className="
                                                        mt-[14px]
                                                        rounded-[4px]
                                                        border
                                                        border-[#F0D4D4]
                                                        bg-[#FFF6F6]
                                                        px-[12px]
                                                        py-[9px]
                                                        text-[12px]
                                                        text-[#B24747]
                                                      "
                                                    >
                                                      {
                                                        proctoringError
                                                      }
                                                    </div>
                                                  )}

                                                  {proctoringIsExpanded && (
                                                    <div
                                                      className="
                                                        mt-[16px]
                                                        overflow-hidden
                                                        rounded-[6px]
                                                        border
                                                        border-[#E4E4EA]
                                                        bg-white
                                                      "
                                                    >
                                                      <div
                                                        className="
                                                          border-b
                                                          border-[#EEEEF2]
                                                          bg-[#F6F6F9]
                                                          px-[14px]
                                                          py-[10px]
                                                        "
                                                      >
                                                        <p
                                                          className="
                                                            font-chakra
                                                            text-[14px]
                                                            font-medium
                                                            text-[#33375B]
                                                          "
                                                        >
                                                          Activity Log
                                                        </p>
                                                      </div>

                                                      <div
                                                        className="
                                                          max-h-[360px]
                                                          overflow-y-auto
                                                        "
                                                      >
                                                        {(
                                                          proctoring.events ||
                                                          []
                                                        ).length ===
                                                        0 ? (
                                                          <p
                                                            className="
                                                              px-[14px]
                                                              py-[20px]
                                                              text-center
                                                              text-[12px]
                                                              text-[#888892]
                                                            "
                                                          >
                                                            Activity məlumatı yoxdur.
                                                          </p>
                                                        ) : (
                                                          (
                                                            proctoring.events ||
                                                            []
                                                          ).map(
                                                            (
                                                              event
                                                            ) => (
                                                              <ProctoringEventRow
                                                                key={
                                                                  event.id
                                                                }
                                                                event={
                                                                  event
                                                                }
                                                                formatDate={
                                                                  formatDate
                                                                }
                                                              />
                                                            )
                                                          )
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}
                                                </>
                                              )}

                                            {!proctoringIsLoading &&
                                              !proctoring && (
                                                <p
                                                  className="
                                                    text-[12px]
                                                    text-[#777780]
                                                  "
                                                >
                                                  Bu müsahibə üçün proctoring məlumatı yoxdur.
                                                </p>
                                              )}
                                          </div>


                                          <SectionTitle>
                                            Suallar və cavablar
                                          </SectionTitle>

                                          <div
                                            className="
                                              space-y-[12px]
                                            "
                                          >
                                            {(
                                              details.interview.questions ||
                                              []
                                            ).map(
                                              (
                                                item
                                              ) => (
                                                <QuestionCard
                                                  key={
                                                    item.id
                                                  }
                                                  item={
                                                    item
                                                  }
                                                />
                                              )
                                            )}
                                          </div>
                                        </>
                                      ) : (
                                        <div
                                          className="
                                            rounded-[6px]
                                            border
                                            border-[#E8E8EE]
                                            bg-[#FAFAFC]
                                            px-[15px]
                                            py-[20px]
                                            text-center
                                            text-[12px]
                                            text-[#85858E]
                                          "
                                        >
                                          Namizədin müsahibəsi yoxdur.
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                          </Fragment>
                        );
                      }
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}


function StatisticCard({
  title,
  value,
  type,
}) {
  let indicatorClass =
    "bg-[#33375B]";

  if (type === "strong") {
    indicatorClass =
      "bg-[#5E8C6A]";
  }

  if (type === "medium") {
    indicatorClass =
      "bg-[#C79A45]";
  }

  if (type === "weak") {
    indicatorClass =
      "bg-[#B85E5E]";
  }

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-[8px]
        bg-white
        px-[17px]
        py-[14px]
      "
    >
      <span
        className={`
          absolute
          bottom-0
          left-0
          top-0
          w-[4px]
          ${indicatorClass}
        `}
      />

      <p
        className="
          text-[12px]
          text-[#898992]
        "
      >
        {title}
      </p>

      <p
        className="
          mt-[4px]
          font-chakra
          text-[25px]
          font-medium
          text-[#33375B]
        "
      >
        {value}
      </p>
    </div>
  );
}


function FilterInput(
  props
) {
  return (
    <input
      {...props}
      className="
        h-[40px]
        w-full
        rounded-[4px]
        border
        border-[#DEDEE4]
        bg-white
        px-[11px]
        text-[12px]
        text-[#33333B]
        outline-none
        transition
        placeholder:text-[#A0A0A9]
        focus:border-[#33375B]
      "
    />
  );
}


function FilterSelect({
  children,
  ...props
}) {
  return (
    <select
      {...props}
      className="
        h-[40px]
        w-full
        cursor-pointer
        rounded-[4px]
        border
        border-[#DEDEE4]
        bg-white
        px-[9px]
        text-[12px]
        text-[#44444D]
        outline-none
        transition
        focus:border-[#33375B]
      "
    >
      {children}
    </select>
  );
}


function TableHeader({
  children,
}) {
  return (
    <th
      className="
        px-[15px]
        py-[12px]
        font-semibold
      "
    >
      {children}
    </th>
  );
}


function TableCell({
  children,
  strong = false,
}) {
  return (
    <td
      className={`
        px-[15px]
        py-[12px]
        text-[#595962]
        ${
          strong
            ? "font-semibold text-[#34343D]"
            : ""
        }
      `}
    >
      {children}
    </td>
  );
}


function ResultBadge({
  result,
}) {
  if (!result) {
    return (
      <span
        className="
          text-[12px]
          text-[#9999A1]
        "
      >
        -
      </span>
    );
  }

  const normalized =
    String(result)
      .toLowerCase();

  let className =
    "bg-[#F0F0F3] text-[#6D6D75]";

  if (
    normalized === "strong"
  ) {
    className =
      "bg-[#EDF6EF] text-[#4E7C5A]";
  }

  if (
    normalized === "medium"
  ) {
    className =
      "bg-[#FFF7E7] text-[#9B732B]";
  }

  if (
    normalized === "weak"
  ) {
    className =
      "bg-[#FFF0F0] text-[#A95050]";
  }

  return (
    <span
      className={`
        inline-flex
        rounded-full
        px-[9px]
        py-[4px]
        text-[12px]
        font-semibold
        uppercase
        ${className}
      `}
    >
      {result}
    </span>
  );
}


function StatusBadge({
  status,
}) {
  if (!status) {
    return (
      <span
        className="
          text-[12px]
          text-[#9999A1]
        "
      >
        -
      </span>
    );
  }

  let className =
    "bg-[#F0F0F3] text-[#676770]";

  if (
    status === "completed"
  ) {
    className =
      "bg-[#EDF6EF] text-[#4F7D5C]";
  }

  if (
    status === "in_progress"
  ) {
    className =
      "bg-[#EEF1FB] text-[#56659D]";
  }

  return (
    <span
      className={`
        inline-flex
        rounded-full
        px-[9px]
        py-[4px]
        text-[12px]
        font-medium
        ${className}
      `}
    >
      {status}
    </span>
  );
}


function InfoBox({
  label,
  value,
}) {
  return (
    <div
      className="
        rounded-[5px]
        border
        border-[#E8E8ED]
        bg-[#FAFAFC]
        px-[13px]
        py-[11px]
      "
    >
      <p
        className="
          text-[12px]
          uppercase
          tracking-[0.03em]
          text-[#9898A0]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-[4px]
          text-[13px]
          font-medium
          text-[#36363F]
        "
      >
        {value || "-"}
      </p>
    </div>
  );
}


function MiniInfo({
  label,
  value,
}) {
  return (
    <div
      className="
        rounded-[5px]
        bg-white
        px-[12px]
        py-[10px]
      "
    >
      <p
        className="
          text-[12px]
          text-[#96969E]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-[4px]
          text-[13px]
          font-medium
          text-[#3B3B44]
        "
      >
        {value ?? "-"}
      </p>
    </div>
  );
}


function SectionTitle({
  children,
}) {
  return (
    <div
      className="
        mb-[11px]
        mt-[20px]
        border-b
        border-[#ECECF0]
        pb-[8px]
      "
    >
      <h3
        className="
          font-chakra
          text-[17px]
          font-medium
          text-[#33375B]
        "
      >
        {children}
      </h3>
    </div>
  );
}


function ProctoringStat({
  label,
  value,
  type,
}) {
  let indicator =
    "bg-[#33375B]";

  if (
    type === "warning"
  ) {
    indicator =
      "bg-[#C79A45]";
  }

  if (
    type === "danger"
  ) {
    indicator =
      "bg-[#B85E5E]";
  }

  if (
    type === "process"
  ) {
    indicator =
      "bg-[#5D739F]";
  }

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-[5px]
        border
        border-[#E7E7EC]
        bg-white
        px-[14px]
        py-[12px]
      "
    >
      <span
        className={`
          absolute
          bottom-0
          left-0
          top-0
          w-[3px]
          ${indicator}
        `}
      />

      <p
        className="
          text-[12px]
          text-[#8A8A94]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-[4px]
          font-chakra
          text-[21px]
          font-medium
          text-[#33375B]
        "
      >
        {value}
      </p>
    </div>
  );
}


function ProctoringEventRow({
  event,
  formatDate,
}) {
  const eventType =
    event?.event_type ||
    "-";

  const data =
    event?.event_data ||
    {};

  const title =
    eventType
      .replaceAll(
        "_",
        " "
      )
      .toUpperCase();

  let detail = "";

  if (
    eventType ===
    "blocked_shortcut"
  ) {
    detail =
      data.shortcut ||
      "";
  }

  if (
    eventType ===
      "process_started" ||
    eventType ===
      "process_stopped"
  ) {
    detail =
      data.process ||
      "";
  }

  if (
    eventType ===
    "proctoring_started"
  ) {
    detail =
      data.initial_process_count !==
        undefined
        ? `${data.initial_process_count} processes`
        : "";
  }

  let badgeClass =
    "bg-[#EEEEF3] text-[#666675]";

  if (
    eventType ===
    "blocked_shortcut"
  ) {
    badgeClass =
      "bg-[#FFF4E5] text-[#9B7027]";
  }

  if (
    eventType ===
    "fullscreen_exit"
  ) {
    badgeClass =
      "bg-[#FFF0F0] text-[#A64D4D]";
  }

  if (
    eventType ===
    "process_started"
  ) {
    badgeClass =
      "bg-[#EEF2FA] text-[#516B9C]";
  }

  if (
    eventType ===
    "window_blur"
  ) {
    badgeClass =
      "bg-[#FFF4E5] text-[#9B7027]";
  }

  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-[15px]
        border-b
        border-[#EEEEF2]
        px-[14px]
        py-[11px]
        last:border-b-0
      "
    >
      <div
        className="
          min-w-0
          flex-1
        "
      >
        <div
          className="
            flex
            flex-wrap
            items-center
            gap-[8px]
          "
        >
          <span
            className={`
              rounded-full
              px-[8px]
              py-[3px]
              text-[12px]
              font-medium
              ${badgeClass}
            `}
          >
            {title}
          </span>

          {detail && (
            <span
              className="
                break-all
                text-[13px]
                font-medium
                text-[#36363F]
              "
            >
              {detail}
            </span>
          )}
        </div>

        {eventType ===
          "proctoring_started" &&
          Array.isArray(
            data.processes
          ) &&
          data.processes.length >
            0 && (
              <details
                className="
                  mt-[8px]
                "
              >
                <summary
                  className="
                    cursor-pointer
                    text-[12px]
                    text-[#66667A]
                  "
                >
                  İlkin process siyahısını göstər
                </summary>

                <div
                  className="
                    mt-[8px]
                    max-h-[160px]
                    overflow-y-auto
                    rounded-[4px]
                    bg-[#F7F7FA]
                    p-[10px]
                  "
                >
                  {data.processes.map(
                    (
                      process,
                      index
                    ) => (
                      <div
                        key={`${process}-${index}`}
                        className="
                          py-[2px]
                          text-[12px]
                          text-[#55555F]
                        "
                      >
                        {process}
                      </div>
                    )
                  )}
                </div>
              </details>
            )}
      </div>

      <div
        className="
          shrink-0
          text-right
          text-[12px]
          text-[#93939C]
        "
      >
        {
          formatDate(
            event.occurred_at
          )
        }
      </div>
    </div>
  );
}


function QuestionCard({
  item,
}) {
  const isMultipleChoice =
    item.question_type ===
    "multiple_choice";

  return (
    <article
      className="
        rounded-[7px]
        border
        border-[#E7E7EC]
        bg-[#FAFAFC]
        p-[16px]
      "
    >
      <div
        className="
          mb-[12px]
          flex
          items-center
          justify-between
        "
      >
        <div
          className="
            flex
            items-center
            gap-[8px]
          "
        >
          <span
            className="
              flex
              h-[28px]
              w-[28px]
              items-center
              justify-center
              rounded-[4px]
              bg-[#33375B]
              text-[12px]
              font-semibold
              text-white
            "
          >
            {item.order}
          </span>

          <span
            className="
              text-[12px]
              text-[#85858E]
            "
          >
            Sual {item.order} / 10
          </span>
        </div>

        <div
          className="
            flex
            gap-[6px]
          "
        >
          <SmallBadge>
            {
              item.difficulty ||
              "-"
            }
          </SmallBadge>

          <SmallBadge>
            {
              isMultipleChoice
                ? "Multiple Choice"
                : "Text Answer"
            }
          </SmallBadge>
        </div>
      </div>

      <p
        className="
          mb-[15px]
          text-[13px]
          font-medium
          leading-[1.6]
          text-[#34343D]
        "
      >
        {item.question}
      </p>

      {isMultipleChoice && (
        <div
          className="
            space-y-[7px]
          "
        >
          {Object.entries(
            item.options || {}
          ).map(
            ([
              optionKey,
              optionValue,
            ]) => {
              const isCorrectOption =
                item.correct_answer ===
                optionKey;

              const isCandidateSelected =
                item.answer ===
                optionKey;

              let optionClass =
                "border-[#E3E3E8] bg-white";

              if (
                isCorrectOption
              ) {
                optionClass =
                  "border-[#BFD8C5] bg-[#F2F8F3]";
              }

              if (
                isCandidateSelected &&
                !isCorrectOption
              ) {
                optionClass =
                  "border-[#E7C5C5] bg-[#FFF5F5]";
              }

              return (
                <div
                  key={
                    optionKey
                  }
                  className={`
                    rounded-[5px]
                    border
                    px-[12px]
                    py-[10px]
                    ${optionClass}
                  `}
                >
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-[15px]
                    "
                  >
                    <p
                      className="
                        text-[12px]
                        text-[#46464F]
                      "
                    >
                      <b>
                        {optionKey}.
                      </b>{" "}
                      {optionValue}
                    </p>

                    <div
                      className="
                        flex
                        shrink-0
                        gap-[5px]
                      "
                    >
                      {isCorrectOption && (
                        <span
                          className="
                            rounded-full
                            bg-[#DDEEE1]
                            px-[7px]
                            py-[3px]
                            text-[12px]
                            font-semibold
                            text-[#4E7959]
                          "
                        >
                          Correct
                        </span>
                      )}

                      {isCandidateSelected && (
                        <span
                          className="
                            rounded-full
                            bg-[#E9EAF3]
                            px-[7px]
                            py-[3px]
                            text-[12px]
                            font-semibold
                            text-[#555A80]
                          "
                        >
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          )}

          <div
            className="
              mt-[10px]
              flex
              gap-[20px]
              text-[12px]
              text-[#777780]
            "
          >
            <span>
              Candidate selected:{" "}
              <b>
                {item.answer || "-"}
              </b>
            </span>

            <span>
              Result:{" "}
              <b>
                {item.is_correct === true
                  ? "Correct"
                  : item.is_correct === false
                    ? "Incorrect"
                    : "-"}
              </b>
            </span>

            <span>
              Score:{" "}
              <b>
                {item.score ?? 0}
                {" / "}
                {item.max_score ?? "-"}
              </b>
            </span>
          </div>
        </div>
      )}

      {!isMultipleChoice && (
        <div>
          <div
            className="
              rounded-[5px]
              border
              border-[#E4E4E9]
              bg-white
              p-[12px]
            "
          >
            <p
              className="
                mb-[5px]
                text-[12px]
                uppercase
                text-[#94949C]
              "
            >
              Candidate Answer
            </p>

            <p
              className="
                text-[12px]
                leading-[1.6]
                text-[#46464F]
              "
            >
              {
                item.answer ||
                "No answer"
              }
            </p>
          </div>

          <div
            className="
              mt-[8px]
              rounded-[5px]
              border
              border-[#E4E4E9]
              bg-white
              p-[12px]
            "
          >
            <div
              className="
                mb-[5px]
                flex
                justify-between
              "
            >
              <p
                className="
                  text-[12px]
                  uppercase
                  text-[#94949C]
                "
              >
                AI Feedback
              </p>

              <span
                className="
                  text-[12px]
                  font-semibold
                  text-[#33375B]
                "
              >
                {item.score ?? 0}
                {" / "}
                {item.max_score ?? 20}
              </span>
            </div>

            <p
              className="
                text-[12px]
                leading-[1.6]
                text-[#46464F]
              "
            >
              {
                item.ai_feedback ||
                "No feedback"
              }
            </p>
          </div>
        </div>
      )}
    </article>
  );
}


function SmallBadge({
  children,
}) {
  return (
    <span
      className="
        rounded-full
        bg-[#ECECF3]
        px-[8px]
        py-[4px]
        text-[12px]
        font-medium
        text-[#66667A]
      "
    >
      {children}
    </span>
  );
}


function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
      />

      <polyline
        points="16 17 21 12 16 7"
      />

      <line
        x1="21"
        y1="12"
        x2="9"
        y2="12"
      />
    </svg>
  );
}


export default AdminCandidates;