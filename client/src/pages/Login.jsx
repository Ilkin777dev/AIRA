import { useState } from "react";

import { useNavigate, Link } from "react-router-dom";

import api, { getCsrfCookie } from "../api/axios";

// Image imports
import bgImage from "../assets/main_bg.png";
import AIRA_Logo_Blue from "../assets/AIRA-Logo-Blue.png";
import XRITDX_Logo from "../assets/XRITDX-Logo.png";

// Components import
import CopyrightSign from "../components/CopyrightSign";

/*
|--------------------------------------------------------------------------
| SLEEP
|--------------------------------------------------------------------------
*/

const sleep = (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

/*
|--------------------------------------------------------------------------
| WAIT FOR AUTHENTICATED SESSION
|--------------------------------------------------------------------------
|
| После POST /api/login Laravel создаёт новую authenticated session.
|
| В Electron Chromium новая session cookie иногда становится доступна
| не мгновенно.
|
| Поэтому перед переходом на Dashboard несколько раз проверяем /api/me.
|
*/

const waitForAuthenticatedSession = async () => {
  const maxAttempts = 5;

  const delay = 200;

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.log(`AUTH SESSION CHECK ${attempt}/${maxAttempts}`);

      const response = await api.get("/api/me");

      console.log("AUTH SESSION READY:", response.data);

      return response.data.user;
    } catch (requestError) {
      lastError = requestError;

      console.warn(
        `AUTH SESSION NOT READY ${attempt}/${maxAttempts}`,
        requestError?.response?.status,
      );

      /*
        |--------------------------------------------------------------------------
        | ONLY RETRY 401
        |--------------------------------------------------------------------------
        */

      if (requestError?.response?.status !== 401) {
        throw requestError;
      }

      /*
        |--------------------------------------------------------------------------
        | LAST ATTEMPT
        |--------------------------------------------------------------------------
        */

      if (attempt === maxAttempts) {
        break;
      }

      await sleep(delay);
    }
  }

  throw lastError || new Error("Authentication session was not created.");
};

function Login() {
  const navigate = useNavigate();

  /*
  |--------------------------------------------------------------------------
  | FORM DATA
  |--------------------------------------------------------------------------
  */

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  /*
  |--------------------------------------------------------------------------
  | UI STATES
  |--------------------------------------------------------------------------
  */

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");

    setError("");

    setIsLoading(true);

    try {
      /*
        |--------------------------------------------------------------------------
        | CSRF COOKIE
        |--------------------------------------------------------------------------
        */

      await getCsrfCookie();

      /*
        |--------------------------------------------------------------------------
        | LOGIN REQUEST
        |--------------------------------------------------------------------------
        */

      const response = await api.post("/api/login", {
        email: email.trim(),

        password,
      });

      const data = response.data;

      console.log("LOGIN RESPONSE:", data);

      /*
        |--------------------------------------------------------------------------
        | WAIT UNTIL SESSION IS REALLY AVAILABLE
        |--------------------------------------------------------------------------
        |
        | Очень важно:
        |
        | НЕ делаем navigate сразу после login.
        |
        | Сначала Laravel должен подтвердить текущую session через /api/me.
        |
        */

      const authenticatedUser = await waitForAuthenticatedSession();

      /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

      setMessage(data.message || "");

      /*
        |--------------------------------------------------------------------------
        | REDIRECT BY ROLE
        |--------------------------------------------------------------------------
        */

      const role = authenticatedUser?.role || data.user?.role;

      if (role === "admin") {
        navigate("/admin/dashboard", {
          replace: true,
        });
      } else {
        navigate("/dashboard", {
          replace: true,
        });
      }
    } catch (requestError) {
      console.error("LOGIN ERROR:", requestError);

      /*
        |--------------------------------------------------------------------------
        | INVALID EMAIL / PASSWORD
        |--------------------------------------------------------------------------
        */

      if (requestError?.response?.status === 401) {
        /*
          |--------------------------------------------------------------------------
          | LOGIN REQUEST ITSELF FAILED
          |--------------------------------------------------------------------------
          */

        const backendMessage = requestError?.response?.data?.message;

        if (backendMessage && backendMessage !== "Unauthenticated.") {
          setError(backendMessage);

          return;
        }

        /*
          |--------------------------------------------------------------------------
          | LOGIN SUCCEEDED BUT SESSION WAS NOT AVAILABLE
          |--------------------------------------------------------------------------
          */

        setError(
          "Sessiyanı yaratmaq mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.",
        );

        return;
      }

      /*
        |--------------------------------------------------------------------------
        | VALIDATION ERROR
        |--------------------------------------------------------------------------
        */

      if (requestError?.response?.status === 422) {
        const errors = requestError?.response?.data?.errors;

        if (errors) {
          const firstError = Object.values(errors).flat()[0];

          setError(firstError || "Daxil etdiyiniz məlumatları yoxlayın.");

          return;
        }
      }

      /*
        |--------------------------------------------------------------------------
        | OTHER ERROR
        |--------------------------------------------------------------------------
        */

      setError(
        requestError?.response?.data?.message ||
          "Sistemə daxil olmaq mümkün olmadı. Yenidən cəhd edin.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <main
      className="
        login-page
        relative
        min-h-screen
        overflow-hidden
        bg-cover
        bg-center
        font-archivo
      "
      style={{
        backgroundImage: `url(${bgImage})`,
      }}
    >
      {/* TOP LEFT LOGO */}

      <button
        type="button"
        onClick={() => navigate("/")}
        className="
                          absolute
                          left-[34px]
                          top-[29px]
                          z-20
                          flex
                          items-center
                          gap-[9px]
                          text-white
                      "
      >
        <img src={XRITDX_Logo} alt="" className="w-[300px]" />
      </button>

      {/* CENTER */}

      <div
        className="
          login-content
          relative
          z-10
          flex
          h-[97vh]
          items-center
          justify-center
          px-4
        "
      >
        <section
          className="
            login-card
            w-full
            max-w-[518px]
            rounded-[7px]
            bg-white
          "
        >
          <div
            className="
              login-card-inner
              px-[29px]
              pb-[62px]
              pt-[43px]
            "
          >
            {/* INTERNAL LOGO */}

            <div className="mb-[28px] flex items-center justify-center gap-[8px]">
              <img src={AIRA_Logo_Blue} alt="" className="w-[250px]" />
            </div>

            {/* HEADER */}

            <div
              className="
                login-header
                text-center
              "
            >
              <h1
                className="
                  login-title
                  font-chakra
                  text-[40px]
                  font-medium
                  leading-[1.2]
                  tracking-[-0.025em]
                  text-[#33375B]
                "
              >
                Hesabınıza daxil olun
              </h1>

              <p
                className="
                  login-description
                  mx-auto
                  mt-[8px]
                  max-w-[300px]
                  text-[15px]
                  leading-[1.45]
                  text-[#737373]
                "
              >
                Platformadan istifadə etmək üçün email və şifrənizi daxil edin
              </p>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="
                login-form
                mt-[42px]
              "
            >
              <div
                className="
                  login-fields
                  space-y-[14px]
                "
              >
                <FormInput
                  label="Email:"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="example@mail.com"
                  autoComplete="email"
                  required
                />

                <FormInput
                  label="Şifrə:"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              {/* SUCCESS */}

              {message && (
                <div
                  className="
                    login-success
                    mt-[14px]
                    rounded-[3px]
                    border
                    border-[#D8E8DC]
                    bg-[#F5FBF6]
                    px-[11px]
                    py-[9px]
                    text-[15px]
                    leading-[1.45]
                    text-[#4B7A55]
                  "
                >
                  {message}
                </div>
              )}

              {/* ERROR */}

              {error && (
                <div
                  className="
                    login-error
                    mt-[14px]
                    rounded-[3px]
                    border
                    border-[#F0D4D4]
                    bg-[#FFF7F7]
                    px-[11px]
                    py-[9px]
                    text-[15px]
                    leading-[1.45]
                    text-[#B24747]
                  "
                >
                  {error}
                </div>
              )}

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                disabled={isLoading}
                className="
                  login-submit
                  mt-[23px]
                  flex
                  h-[43px]
                  w-full
                  items-center
                  justify-center
                  gap-[8px]
                  rounded-[3px]
                  bg-[#33375B]
                  px-[10px]
                  text-[11px]
                  font-medium
                  text-white
                  transition
                  hover:bg-[#292D4E]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {isLoading && <Spinner />}

                {isLoading ? "Daxil olunur..." : "Daxil ol"}
              </button>

              {/* REGISTER LINK */}

              <div
                className="
                  login-register
                  mt-[22px]
                  text-center
                "
              >
                <span
                  className="
                    login-register-text
                    text-[13px]
                    text-[#737373]
                  "
                >
                  Hesabınız yoxdur?{" "}
                </span>

                <Link
                  to="/register"
                  className="
                    login-register-link
                    text-[13px]
                    font-semibold
                    text-[#33375B]
                    transition
                    hover:underline
                  "
                >
                  Qeydiyyatdan keçin
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>

      <CopyrightSign />
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| FORM INPUT
|--------------------------------------------------------------------------
*/

function FormInput({ label, ...props }) {
  return (
    <label
      className="
        login-input-group
        block
      "
    >
      <span
        className="
          login-input-label
          mb-[6px]
          block
          text-[13px]
          font-medium
          text-[#252531]
        "
      >
        {label}
      </span>

      <input
        {...props}
        className="
          login-input
          h-[39px]
          w-full
          rounded-[3px]
          border
          border-[#E0E0E4]
          bg-white
          px-[11px]
          text-[10px]
          text-[#33375B]
          outline-none
          transition
          placeholder:text-[#A7A7AD]
          focus:border-[#33375B]
        "
      />
    </label>
  );
}

/*
|--------------------------------------------------------------------------
| SPINNER
|--------------------------------------------------------------------------
*/

function Spinner() {
  return (
    <span
      className="
        login-spinner
        inline-block
        h-[14px]
        w-[14px]
        animate-spin
        rounded-full
        border-2
        border-white/30
        border-t-white
      "
    />
  );
}

export default Login;
