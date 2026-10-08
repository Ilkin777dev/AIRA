import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/axios";

// Image imports
import bgImage from "../assets/main_bg.png";
import Logo from "../assets/AI_Recruiter_Logo.png";

import AIRA_Logo_White from "../assets/AIRA-Logo-White.png";
import XRITDX_Logo from "../assets/XRITDX-Logo.png";

// Components import
import CopyrightSign from "../components/CopyrightSign";


function Dashboard() {
  const navigate =
    useNavigate();


  /*
  |--------------------------------------------------------------------------
  | USER
  |--------------------------------------------------------------------------
  */

  const [
    user,
    setUser,
  ] = useState(null);


  /*
  |--------------------------------------------------------------------------
  | STATES
  |--------------------------------------------------------------------------
  */

  const [
    error,
    setError,
  ] = useState("");

  const [
    isStarting,
    setIsStarting,
  ] = useState(false);

  const [
    acceptedRules,
    setAcceptedRules,
  ] = useState(false);


  /*
  |--------------------------------------------------------------------------
  | LOAD USER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    const fetchUser =
      async () => {

        try {

          const response =
            await api.get(
              "/api/me"
            );


          console.log(
            "CURRENT USER:",
            response.data.user
          );


          setUser(
            response.data.user
          );

        } catch (
          requestError
        ) {

          console.error(
            "Failed to load user:",
            requestError
          );


          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            "İstifadəçi məlumatlarını yükləmək mümkün olmadı."
          );
        }
      };


    fetchUser();

  }, []);


  /*
  |--------------------------------------------------------------------------
  | START INTERVIEW
  |--------------------------------------------------------------------------
  */

  const handleStartInterview =
    async () => {

      if (
        isStarting
      ) {
        return;
      }


      if (
        !acceptedRules
      ) {

        setError(
          "İmtahana başlamazdan əvvəl qaydaları qəbul edin."
        );

        return;
      }


      try {

        setError("");

        setIsStarting(
          true
        );


        /*
        |--------------------------------------------------------------------------
        | START INTERVIEW ON BACKEND
        |--------------------------------------------------------------------------
        */

        const response =
          await api.post(
            "/api/interviews/start"
          );


        console.log(
          "START INTERVIEW STATUS:",
          response.status
        );


        console.log(
          "START INTERVIEW DATA:",
          response.data
        );


        const interview =
          response.data.interview;

        const question =
          response.data.question;


        if (
          !interview
        ) {

          throw new Error(
            "Interview was not returned by backend."
          );
        }


        if (
          !question
        ) {

          throw new Error(
            "Question was not returned by backend."
          );
        }


        /*
        |--------------------------------------------------------------------------
        | ENABLE AIRA EXAM MODE
        |--------------------------------------------------------------------------
        |
        | Работает только внутри Electron.
        |
        | В обычном browser dev mode
        | window.electronAPI отсутствует,
        | поэтому optional chaining не даст ошибку.
        |
        */

        if (
          window
            .electronAPI
            ?.setExamMode
        ) {

          await window
            .electronAPI
            .setExamMode(
              true
            );
        }


        /*
        |--------------------------------------------------------------------------
        | GO TO INTERVIEW
        |--------------------------------------------------------------------------
        */

        navigate(
          "/interview",
          {
            state: {
              interview,
              question,
            },
          }
        );

      } catch (
        requestError
      ) {

        console.error(
          "START INTERVIEW ERROR:",
          requestError
            ?.response
            ?.data ||
          requestError
        );


        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError.message ||
          "Müsahibəni başlatmaq mümkün olmadı."
        );

      } finally {

        setIsStarting(
          false
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const handleLogout =
    async () => {

      try {

        /*
        |--------------------------------------------------------------------------
        | DISABLE EXAM MODE JUST IN CASE
        |--------------------------------------------------------------------------
        */

        if (
          window
            .electronAPI
            ?.setExamMode
        ) {

          await window
            .electronAPI
            .setExamMode(
              false
            );
        }


        await api.post(
          "/api/logout"
        );


        navigate(
          "/login"
        );

      } catch (
        requestError
      ) {

        console.error(
          "Logout failed:",
          requestError
        );


        setError(
          "Sistemdən çıxış etmək mümkün olmadı."
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | INTERVIEW
  |--------------------------------------------------------------------------
  */

  const candidate =
    user
      ?.candidate_profile;


  const latestInterview =
    candidate
      ?.latest_interview;


  /*
  |--------------------------------------------------------------------------
  | RULES
  |--------------------------------------------------------------------------
  */

  const rules = [

    "“İmtahana başla” düyməsinə klik etdiyiniz andan 30 dəqiqəlik geri sayım başlayır və dayandırıla bilməz.",

    "Qiymətləndirmədə ümumilikdə 10 sual təqdim olunur: 4 asan, 4 orta və 2 çətin sual.",

    "Suallara əvvəlcədən baxa bilərsiniz. Hər sualı cavablandırdıqdan sonra növbəti suala keçilir.",

    "Çoxseçimli sualların cavab variantlarının ardıcıllığı hər namizəd üçün fərqli ola bilər.",

    "AIRA qiymətləndirmə zamanı tam ekran rejimində işləyir.",

    "İmtahan zamanı sağ klik, copy, paste və cut funksiyaları bloklanır.",

    "Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A və uyğun macOS qısayollarından istifadə etmək mümkün deyil.",

    "Qiymətləndirmə zamanı üzünüz kamerada görünən vəziyyətdə olmalı və mikrofonunuz aktiv olmalıdır.",

    "Vaxt başa çatdıqda qiymətləndirmə avtomatik olaraq yekunlaşdırıla bilər.",

    "Qısa cavab tələb edən suallar AI tərəfindən ayrıca qiymətləndiriləcək.",

    "Sessiya zamanı cihaz və müsahibə ilə bağlı texniki məlumatlar qeydə alına bilər.",

    "Kənar yardım, süni intellekt alətləri və əlavə cihazlardan istifadə etmək qadağandır.",
  ];


  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <main
      className="
        dashboard-page
        relative
        min-h-screen
        overflow-x-hidden
        bg-cover
        bg-center
        bg-fixed
        font-archivo
      "
      style={{
        backgroundImage:
          `url(${bgImage})`,
      }}
    >

      {/* HEADER */}

      <header
        className="
          dashboard-header
          absolute
          left-[34px]
          right-[34px]
          top-[29px]
          z-20
          flex
          items-center
          justify-between
        "
      >

        {/* LOGO */}

        <div className="mb-[28px] flex items-center justify-center gap-[8px]">
          <img src={AIRA_Logo_White} alt="" className="w-[200px]" />
        </div>


        {/* LOGOUT */}

        <button
          type="button"
          onClick={
            handleLogout
          }
          className="
            dashboard-logout
            rounded-[4px]
            border
            border-white/30
            bg-white/5
            px-[18px]
            py-[9px]
            text-[12px]
            font-medium
            text-white
            backdrop-blur-sm
            transition
            hover:bg-white/10
          "
        >
          Çıxış
        </button>

      </header>


      {/* PAGE CONTENT */}

      <div
        className="
          dashboard-content
          relative
          z-10
          mx-auto
          flex
          min-h-screen
          w-full
          max-w-[900px]
          flex-col
          justify-center
          px-[20px]
          pb-[30px]
          pt-[125px]
        "
      >

        {/* ERROR */}

        {error && (

          <div
            className="
              dashboard-error
              mb-[12px]
              rounded-[4px]
              border
              border-[#F0D4D4]
              bg-[#FFF7F7]
              px-[15px]
              py-[11px]
              text-[13px]
              text-[#B24747]
            "
          >
            {error}
          </div>

        )}


        {/* INTERVIEW INFORMATION */}

        <section
          className="
            dashboard-info
            overflow-hidden
            bg-white
          "
        >

          {/* TITLE */}

          <div
            className="
              dashboard-info-header
              flex
              h-[46px]
              items-center
              gap-[10px]
              bg-[#33375B]
              px-[18px]
              text-white
            "
          >

            <InfoIcon />

            <h2
              className="
                dashboard-info-title
                text-[15px]
                font-medium
              "
            >
              İmtahan məlumatları
            </h2>

          </div>


          {/* CONTENT */}

          {!user ? (

            <div
              className="
                dashboard-loading
                flex
                min-h-[150px]
                items-center
                justify-center
              "
            >
              <LoadingSpinner />
            </div>

          ) : (

            <div
              className="
                dashboard-info-content
                px-[19px]
                py-[4px]
              "
            >

              {/* ROW 1 */}

              <div
                className="
                  dashboard-info-row
                  grid
                  grid-cols-2
                  border-b
                  border-[#EEEEF2]
                  py-[12px]
                "
              >

                <InfoItem
                  label="Namizəd"
                  value={`${user?.candidate_profile?.name || ""} ${user?.candidate_profile?.surname || ""}`.trim() || "-"}
                />

                <InfoItem
                  label="E-poçt"
                  value={
                    user.email ||
                    "-"
                  }
                />

              </div>


              {/* ROW 2 */}

              <div
                className="
                  dashboard-info-row
                  grid
                  grid-cols-2
                  border-b
                  border-[#EEEEF2]
                  py-[12px]
                "
              >

                <InfoItem
                  label="İmtahan müddəti"
                  value="30 dəqiqə"
                />

                <InfoItem
                  label="Suallar"
                  value="10"
                />

              </div>


              {/* ROW 3 */}

              <div
                className="
                  dashboard-info-row
                  grid
                  grid-cols-2
                  py-[12px]
                "
              >

                <InfoItem
                  label="Format"
                  value="8 çoxseçimli + 2 qısa cavab"
                />

                <InfoItem
                  label="Cəhd sayı"
                  value="1"
                />

              </div>


              {/* ROW 4 */}

              <div
                className="
                  dashboard-info-row
                  grid
                  grid-cols-2
                  border-t
                  border-[#EEEEF2]
                  py-[12px]
                "
              >

                <InfoItem
                  label="Vəzifə"
                  value={
                    candidate
                      ?.position
                      ?.name ||
                    "-"
                  }
                />

                <InfoItem
                  label="Status"
                  value={
                    formatInterviewStatus(
                      latestInterview
                        ?.status
                    )
                  }
                />

              </div>

            </div>

          )}

        </section>


        {/* RULES */}

        <section
          className="
            dashboard-rules
            mt-[12px]
            overflow-hidden
            bg-white
          "
        >

          {/* TITLE */}

          <div
            className="
              dashboard-rules-header
              flex
              h-[48px]
              items-center
              gap-[10px]
              border-b
              border-[#E9E9ED]
              px-[18px]
            "
          >

            <WarningIcon />

            <h2
              className="
                dashboard-rules-title
                text-[14px]
                font-medium
                text-[#252531]
              "
            >
              İmtahan qaydaları
            </h2>

          </div>


          {/* LIST */}

          <div
            className="
              dashboard-rules-list
              px-[20px]
              py-[5px]
            "
          >

            {rules.map(
              (
                rule,
                index
              ) => (

                <div
                  key={
                    index
                  }
                  className="
                    dashboard-rule
                    flex
                    items-start
                    gap-[14px]
                    border-b
                    border-[#F1F1F3]
                    py-[10px]
                    last:border-b-0
                  "
                >

                  <span
                    className="
                      dashboard-rule-number
                      flex
                      h-[20px]
                      w-[20px]
                      shrink-0
                      items-center
                      justify-center
                      rounded-[3px]
                      bg-[#F0F1F5]
                      text-[14px]
                      font-semibold
                      text-[#5F6174]
                    "
                  >
                    {
                      index + 1
                    }
                  </span>


                  <p
                    className="
                      dashboard-rule-text
                      pt-[1px]
                      text-[14px]
                      leading-[1.55]
                      text-[#33333B]
                    "
                  >
                    {rule}
                  </p>

                </div>

              )
            )}

          </div>

        </section>


        {/* AGREEMENT */}

        <label
          className="
            dashboard-agreement
            mt-[12px]
            flex
            cursor-pointer
            items-start
            gap-[13px]
            rounded-[4px]
            bg-white
            px-[20px]
            py-[15px]
          "
        >

          <input
            type="checkbox"
            checked={
              acceptedRules
            }
            onChange={
              event => {

                setAcceptedRules(
                  event
                    .target
                    .checked
                );

                setError("");
              }
            }
            className="
              dashboard-checkbox
              mt-[2px]
              h-[16px]
              w-[16px]
              shrink-0
              cursor-pointer
              accent-[#33375B]
            "
          />


          <p
            className="
              dashboard-agreement-text
              text-[12px]
              leading-[1.65]
              text-[#33333B]
            "
          >
            İmtahan qaydalarını oxuduğumu və başa düşdüyümü
            təsdiq edirəm. Qaydalara əməl edəcəyimi və kənar
            yardım, süni intellekt alətləri və əlavə cihazlardan
            istifadə etməyəcəyimi qəbul edirəm. Qaydaların
            pozulmasının kənarlaşdırılma ilə nəticələnə biləcəyini
            anlayıram.
          </p>

        </label>


        {/* START BUTTON */}

        <button
          type="button"
          onClick={
            handleStartInterview
          }
          disabled={
            isStarting ||
            !acceptedRules
          }
          className="
            dashboard-start-button
            mt-[15px]
            flex
            h-[49px]
            w-full
            items-center
            justify-center
            gap-[9px]
            rounded-[4px]
            bg-white
            text-[13px]
            font-medium
            text-[#33375B]
            transition
            hover:bg-[#F5F5F8]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >

          {isStarting && (
            <LoadingSpinner
              small
            />
          )}


          {isStarting
            ? "İmtahan başladılır..."
            : latestInterview
                ?.status ===
              "in_progress"
              ? "İmtahana davam et"
              : "İmtahana başla"}

        </button>

      </div>

    </main>
  );
}


/*
|--------------------------------------------------------------------------
| INFO ITEM
|--------------------------------------------------------------------------
*/

function InfoItem({
  label,
  value,
}) {

  return (
    <div
      className="
        dashboard-info-item
        grid
        grid-cols-[150px_1fr]
        items-center
        gap-[10px]
        px-[5px]
      "
    >

      <span
        className="
          dashboard-info-label
          text-[14px]
          text-[#94949D]
        "
      >
        {label}
      </span>


      <span
        className="
          dashboard-info-value
          text-[14px]
          font-medium
          text-[#3B3B44]
        "
      >
        {value}
      </span>

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| INTERVIEW STATUS
|--------------------------------------------------------------------------
*/

function formatInterviewStatus(
  status
) {

  if (
    !status
  ) {
    return "Başlanmayıb";
  }


  if (
    status ===
    "in_progress"
  ) {
    return "Davam edir";
  }


  if (
    status ===
    "completed"
  ) {
    return "Tamamlanıb";
  }


  if (
    status ===
    "finished"
  ) {
    return "Tamamlanıb";
  }


  return status;
}


/*
|--------------------------------------------------------------------------
| INFO ICON
|--------------------------------------------------------------------------
*/

function InfoIcon() {

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
      className="
        dashboard-info-icon
        shrink-0
      "
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        d="M12 11v5"
      />

      <path
        d="M12 8h.01"
      />
    </svg>
  );
}


/*
|--------------------------------------------------------------------------
| WARNING ICON
|--------------------------------------------------------------------------
*/

function WarningIcon() {

  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#33333B"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="
        dashboard-warning-icon
        shrink-0
      "
    >

      <path
        d="M10.3 3.8 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"
      />

      <path
        d="M12 9v4"
      />

      <path
        d="M12 17h.01"
      />

    </svg>
  );
}


/*
|--------------------------------------------------------------------------
| LOADING
|--------------------------------------------------------------------------
*/

function LoadingSpinner({
  small = false,
}) {

  return (
    <span
      className={`
        dashboard-spinner
        inline-block
        animate-spin
        rounded-full
        border-2
        border-[#33375B]/20
        border-t-[#33375B]
        ${
          small
            ? "h-[15px] w-[15px]"
            : "h-[24px] w-[24px]"
        }
      `}
    />
  );
}


export default Dashboard;