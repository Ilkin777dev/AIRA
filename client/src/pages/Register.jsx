import { useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import api, { getCsrfCookie } from "../api/axios";

// Image imports
import bgImage from "../assets/main_bg.png";
import AIRA_Logo_Blue from "../assets/AIRA-Logo-Blue.png";
import XRITDX_Logo from "../assets/XRITDX-Logo.png";

// Components import
import CopyrightSign from "../components/CopyrightSign";

const TOTAL_STEPS = 3;

function Register() {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [screen, setScreen] = useState("registration");

  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirmation: "",

    name: "",
    surname: "",
    patronymic: "",

    fin_code: "",
    phone: "+994 - ",
  });

  const [cvFile, setCvFile] = useState(null);

  const [cvAnalysis, setCvAnalysis] = useState(null);

  const [selectedPosition, setSelectedPosition] = useState("");

  const [customPosition, setCustomPosition] = useState("");

  const [useCustomPosition, setUseCustomPosition] = useState(false);

  const [isDragging, setIsDragging] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [error, setError] = useState("");

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    /*
    |--------------------------------------------------------------------------
    | FIN CODE
    |--------------------------------------------------------------------------
    */

    if (name === "fin_code") {
      const formattedFin = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 7);

      setFormData((previous) => ({
        ...previous,
        fin_code: formattedFin,
      }));

      setError("");

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | PHONE
    |--------------------------------------------------------------------------
    */

    if (name === "phone") {
      let digits = value.replace(/\D/g, "");

      /*
       * Убираем 994,
       * потому что код страны
       * у нас уже постоянный.
       */

      if (digits.startsWith("994")) {
        digits = digits.slice(3);
      }

      /*
       * Максимум 10 цифр:
       *
       * 0558212322
       */

      digits = digits.slice(0, 10);

      let formattedPhone = "+994 - ";

      /*
       * 055
       */

      if (digits.length > 0) {
        formattedPhone += digits.slice(0, 3);
      }

      /*
       * 821
       */

      if (digits.length > 3) {
        formattedPhone += ` - ${digits.slice(3, 6)}`;
      }

      /*
       * 23
       */

      if (digits.length > 6) {
        formattedPhone += ` - ${digits.slice(6, 8)}`;
      }

      /*
       * 22
       */

      if (digits.length > 8) {
        formattedPhone += ` - ${digits.slice(8, 10)}`;
      }

      setFormData((previous) => ({
        ...previous,
        phone: formattedPhone,
      }));

      setError("");

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | OTHER INPUTS
    |--------------------------------------------------------------------------
    */

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | VALIDATE REGISTRATION STEPS
  |--------------------------------------------------------------------------
  */

  const validateStep = () => {
    setError("");

    if (step === 1) {
      if (!formData.email.trim()) {
        setError("Email daxil edin.");

        return false;
      }

      if (!formData.email.includes("@")) {
        setError("Düzgün email daxil edin.");

        return false;
      }

      if (formData.password.length < 8) {
        setError("Şifrə minimum 8 simvoldan ibarət olmalıdır.");

        return false;
      }

      if (formData.password !== formData.password_confirmation) {
        setError("Şifrələr uyğun gəlmir.");

        return false;
      }
    }

    if (step === 2) {
      if (!formData.name.trim()) {
        setError("Ad daxil edin.");

        return false;
      }

      if (!formData.surname.trim()) {
        setError("Soyad daxil edin.");

        return false;
      }

      if (!formData.patronymic.trim()) {
        setError("Ata adı daxil edin.");

        return false;
      }
    }

    if (step === 3) {
      if (!formData.fin_code.trim()) {
        setError("FIN kod daxil edin.");

        return false;
      }

      /*
       * FIN должен состоять
       * ровно из 7 символов:
       *
       * A-Z / 0-9
       */

      if (!/^[A-Z0-9]{7}$/.test(formData.fin_code)) {
        setError("FIN kod 7 simvoldan ibarət olmalıdır.");

        return false;
      }

      /*
       * Достаём только цифры номера
       * без +994.
       */

      const phoneDigits = formData.phone.replace(/\D/g, "").replace(/^994/, "");

      /*
       * После +994 должно быть
       * ровно 10 цифр.
       */

      if (phoneDigits.length !== 10) {
        setError("Telefon nömrəsini tam daxil edin.");

        return false;
      }
    }

    return true;
  };

  /*
  |--------------------------------------------------------------------------
  | NEXT
  |--------------------------------------------------------------------------
  */

  const nextStep = () => {
    if (!validateStep()) {
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep((previous) => previous + 1);

      return;
    }

    /*
     * После 3-го шага
     * переходим к CV.
     */

    setScreen("cv");

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | BACK
  |--------------------------------------------------------------------------
  */

  const previousStep = () => {
    setError("");

    if (screen === "cv") {
      setScreen("registration");

      setStep(3);

      return;
    }

    if (screen === "result") {
      setScreen("cv");

      return;
    }

    setStep((previous) => Math.max(previous - 1, 1));
  };

  /*
  |--------------------------------------------------------------------------
  | FILE VALIDATION
  |--------------------------------------------------------------------------
  */

  const validateCvFile = (file) => {
    if (!file) {
      return false;
    }

    const allowedExtensions = ["pdf", "doc", "docx"];

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setError("Yalnız PDF, DOC və DOCX faylları qəbul edilir.");

      return false;
    }

    const maximumSize = 10 * 1024 * 1024;

    if (file.size > maximumSize) {
      setError("CV faylının ölçüsü maksimum 10 MB ola bilər.");

      return false;
    }

    return true;
  };

  /*
  |--------------------------------------------------------------------------
  | FILE
  |--------------------------------------------------------------------------
  */

  const handleFile = (file) => {
    setError("");

    if (!validateCvFile(file)) {
      return;
    }

    setCvFile(file);

    setCvAnalysis(null);

    setSelectedPosition("");

    setCustomPosition("");

    setUseCustomPosition(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    handleFile(file);
  };

  /*
  |--------------------------------------------------------------------------
  | DRAG & DROP
  |--------------------------------------------------------------------------
  */

  const handleDrop = (event) => {
    event.preventDefault();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    handleFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  /*
  |--------------------------------------------------------------------------
  | ANALYZE CV
  |--------------------------------------------------------------------------
  */

  const analyzeCv = async () => {
    if (!cvFile) {
      setError("CV faylı seçin.");

      return;
    }

    setError("");

    setIsAnalyzing(true);

    try {
      await getCsrfCookie();

      const body = new FormData();

      body.append("cv", cvFile);

      const response = await api.post("/api/cv/analyze", body);

      const analysis = response.data.cv_analysis;

      setCvAnalysis(analysis);

      if (analysis?.suggested_positions?.length > 0) {
        setSelectedPosition(analysis.suggested_positions[0]);
      }

      setScreen("result");
    } catch (requestError) {
      console.error("CV analysis error:", requestError);

      const message = requestError?.response?.data?.message;

      setError(message || "CV analiz edilərkən xəta baş verdi.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | FINAL POSITION
  |--------------------------------------------------------------------------
  */

  const getFinalPosition = () => {
    if (useCustomPosition) {
      return customPosition.trim();
    }

    return selectedPosition.trim();
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE ACCOUNT
  |--------------------------------------------------------------------------
  */

  const createAccount = async () => {
    if (!cvAnalysis?.id) {
      setError("Əvvəlcə CV analiz edilməlidir.");

      return;
    }

    const finalPosition = getFinalPosition();

    if (!finalPosition) {
      setError("Vəzifə seçin və ya daxil edin.");

      return;
    }

    setError("");

    setIsCreatingAccount(true);

    try {
      /*
      |--------------------------------------------------------------------------
      | CSRF
      |--------------------------------------------------------------------------
      */

      await getCsrfCookie();

      /*
      |--------------------------------------------------------------------------
      | CONFIRM POSITION
      |--------------------------------------------------------------------------
      */

      await api.post(`/api/cv/${cvAnalysis.id}/confirm-position`, {
        selected_position: finalPosition,
      });

      /*
      |--------------------------------------------------------------------------
      | REGISTER
      |--------------------------------------------------------------------------
      */

      await api.post("/api/register", {
        name: formData.name.trim(),

        surname: formData.surname.trim(),

        patronymic: formData.patronymic.trim(),

        email: formData.email.trim(),

        phone: formData.phone.trim(),

        fin_code: formData.fin_code.trim().toUpperCase(),

        password: formData.password,

        password_confirmation: formData.password_confirmation,

        cv_analysis_id: cvAnalysis.id,
      });

      navigate("/login", {
        state: {
          registrationSuccess: true,

          email: formData.email,
        },
      });
    } catch (requestError) {
      console.error("Registration error:", requestError);

      const responseData = requestError?.response?.data;

      if (responseData?.errors) {
        const firstError = Object.values(responseData.errors)
          .flat()
          .find(Boolean);

        setError(firstError || "Məlumatları yoxlayın.");
      } else {
        setError(responseData?.message || "Qeydiyyat zamanı xəta baş verdi.");
      }
    } finally {
      setIsCreatingAccount(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RESET CV
  |--------------------------------------------------------------------------
  */

  const resetCv = () => {
    setCvAnalysis(null);

    setCvFile(null);

    setSelectedPosition("");

    setCustomPosition("");

    setUseCustomPosition(false);

    setError("");

    setScreen("cv");
  };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <main
      className="
                relative
                h-[100vh]
                overflow-hidden
                font-archivo
                bg-cover
                bg-center
            "
      style={{ backgroundImage: `url(${bgImage})` }}
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
        {/* <HirelyLogo size="38" white /> */}

        <img src={XRITDX_Logo} alt="" className="w-[300px]" />
      </button>

      {/* CENTER */}

      <div
        className="
                    relative
                    z-10
                    flex
                    h-[97%]
                    items-center
                    justify-center
                    px-4
                    
                "
      >
        <section
          className={`
                        register-card
                        w-full
                        bg-white
                        transition-all
                        duration-300
                        ${
                          screen === "result"
                            ? "max-w-[660px]"
                            : "max-w-[518px]"
                        }
                        rounded-[7px]
                    `}
        >
          <div
            className={`
                            ${
                              screen === "result"
                                ? "px-[34px] py-[34px]"
                                : "px-[29px] pb-[62px] pt-[43px]"
                            }
                        `}
          >
            {/* INTERNAL LOGO */}

            <div
              className="
                                mb-[28px]
                                flex
                                items-center
                                justify-center
                                gap-[8px]
                            "
            >

              <img src={AIRA_Logo_Blue} alt="" className="w-[250px]" />
            </div>

            {screen === "registration" && (
              <RegistrationScreen
                step={step}
                formData={formData}
                handleInputChange={handleInputChange}
                error={error}
                nextStep={nextStep}
                previousStep={previousStep}
              />
            )}

            {screen === "cv" && (
              <CvUploadScreen
                cvFile={cvFile}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
                handleDrop={handleDrop}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                isDragging={isDragging}
                isAnalyzing={isAnalyzing}
                analyzeCv={analyzeCv}
                previousStep={previousStep}
                error={error}
              />
            )}

            {screen === "result" && (
              <AnalysisScreen
                analysis={cvAnalysis}
                cvFile={cvFile}
                selectedPosition={selectedPosition}
                setSelectedPosition={setSelectedPosition}
                useCustomPosition={useCustomPosition}
                setUseCustomPosition={setUseCustomPosition}
                customPosition={customPosition}
                setCustomPosition={setCustomPosition}
                createAccount={createAccount}
                isCreatingAccount={isCreatingAccount}
                previousStep={previousStep}
                resetCv={resetCv}
                error={error}
              />
            )}
          </div>
        </section>
      </div>

      <CopyrightSign />

    </main>
  );
}

/*
|--------------------------------------------------------------------------
| REGISTRATION SCREEN
|--------------------------------------------------------------------------
*/

function RegistrationScreen({
  step,
  formData,
  handleInputChange,
  error,
  nextStep,
  previousStep,
}) {
  return (
    <>
      <div
        className="
                    text-center
                "
      >
        <h1
          className="
                        font-chakra
                        text-[40px]
                        font-medium
                        leading-[1.2]
                        tracking-[-0.025em]
                        text-[#33375B]
                    "
        >
          Hesabınızı yaradın
        </h1>

        <p
          className="
                        mx-auto
                        mt-[8px]
                        max-w-[290px]
                        text-[15px]
                        leading-[1.45]
                        text-[#737373]
                    "
        >
          Platformadan istifadə etməyə başlamaq üçün məlumatlarınızı daxil edin
        </p>
      </div>

      <StepIndicator currentStep={step} />

      <div
        className="
                    mt-[33px]
                "
      >
        {step === 1 && (
          <div
            className="
                            space-y-[14px]
                        "
          >
            <FormInput
              label="Email:"
              name="email"
              type="email"
              value={formData.email}
              placeholder="example@mail.com"
              onChange={handleInputChange}
            />

            <FormInput
              label="Şifrə:"
              name="password"
              type="password"
              value={formData.password}
              placeholder="••••••••"
              onChange={handleInputChange}
            />

            <FormInput
              label="Şifrəni təsdiq edin:"
              name="password_confirmation"
              type="password"
              value={formData.password_confirmation}
              placeholder="••••••••"
              onChange={handleInputChange}
            />
          </div>
        )}

        {step === 2 && (
          <div
            className="
                            space-y-[14px]
                        "
          >
            <FormInput
              label="Ad:"
              name="name"
              value={formData.name}
              placeholder="Adınızı daxil edin"
              onChange={handleInputChange}
            />

            <FormInput
              label="Soyad:"
              name="surname"
              value={formData.surname}
              placeholder="Soyadınızı daxil edin"
              onChange={handleInputChange}
            />

            <FormInput
              label="Ata adı:"
              name="patronymic"
              value={formData.patronymic}
              placeholder="Ata adınızı daxil edin"
              onChange={handleInputChange}
            />
          </div>
        )}

        {step === 3 && (
          <div
            className="
                            space-y-[14px]
                        "
          >
            <FormInput
              label="Fin kod:"
              name="fin_code"
              value={formData.fin_code}
              maxLength={7}
              placeholder="XXXXXXX"
              onChange={handleInputChange}
            />

            <FormInput
              label="Nömrə:"
              name="phone"
              value={formData.phone}
              placeholder="+994 - 055 - 821 - 23 - 22"
              onChange={handleInputChange}
            />
          </div>
        )}

        {error && <ErrorMessage text={error} />}

        <div
          className="
                        mt-[23px]
                        grid
                        grid-cols-2
                        gap-[14px]
                    "
        >
          {step > 1 ? (
            <SecondaryButton onClick={previousStep}>Geriyə</SecondaryButton>
          ) : (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="
                                h-[43px]
                                rounded-[3px]
                                border
                                border-[#33375B]
                                bg-white
                                text-[11px]
                                font-medium
                                text-[#33375B]
                                transition
                                hover:bg-[#F7F7FA]
                            "
            >
              Geriyə
            </button>
          )}

          <PrimaryButton onClick={nextStep}>
            {step === 3 ? "Davam et" : "Davam et"}
          </PrimaryButton>
        </div>
      </div>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| STEP INDICATOR
|--------------------------------------------------------------------------
*/

function StepIndicator({ currentStep }) {
  return (
    <div
      className="
                relative
                mt-[56px]
                px-[5px]
            "
    >
      <div
        className="
                    absolute
                    left-[17px]
                    right-[17px]
                    top-[13px]
                    h-px
                    bg-[#E1E1E5]
                "
      />

      <div
        className="
                    relative
                    z-10
                    flex
                    items-center
                    justify-between
                "
      >
        {[1, 2, 3].map((number) => {
          const completed = number < currentStep;

          return (
            <div
              key={number}
              className="
                                    flex
                                    h-[35px]
                                    w-[35px]
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-[#33375B]
                                    text-[15px]
                                    font-semibold
                                    text-white
                                "
            >
              {completed ? <CheckSmallIcon /> : number}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| CV UPLOAD
|--------------------------------------------------------------------------
*/

function CvUploadScreen({
  cvFile,
  fileInputRef,
  handleFileChange,
  handleDrop,
  handleDragOver,
  handleDragLeave,
  isDragging,
  isAnalyzing,
  analyzeCv,
  previousStep,
  error,
}) {
  return (
    <>
      <ScreenTitle
        title="CV-nizi yükləyin"
        description="CV-nizi analiz edərək bacarıqlarınızı və sizə uyğun vəzifələri müəyyən edəcəyik."
      />

      <div
        className="
                    mt-[34px]
                "
      >
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
                        flex
                        min-h-[180px]
                        cursor-pointer
                        flex-col
                        items-center
                        justify-center
                        rounded-[4px]
                        border
                        border-dashed
                        px-6
                        text-center
                        transition
                        ${
                          isDragging
                            ? "border-[#33375B] bg-[#F5F5F9]"
                            : "border-[#D7D7DD] bg-[#FCFCFD] hover:border-[#33375B]"
                        }
                    `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />

          <div
            className="
                            mb-[13px]
                            flex
                            h-[42px]
                            w-[42px]
                            items-center
                            justify-center
                            rounded-[4px]
                            bg-[#33375B]
                            text-white
                        "
          >
            <UploadIcon />
          </div>

          {cvFile ? (
            <>
              <p
                className="
                                    max-w-full
                                    truncate
                                    text-[12px]
                                    font-semibold
                                    text-[#33375B]
                                "
              >
                {cvFile.name}
              </p>

              <p
                className="
                                    mt-[5px]
                                    text-[10px]
                                    text-[#90909A]
                                "
              >
                {formatFileSize(cvFile.size)}
              </p>
            </>
          ) : (
            <>
              <p
                className="
                                    text-[18px]
                                    font-semibold
                                    text-[#33375B]
                                "
              >
                CV faylınızı seçin
              </p>

              <p
                className="
                                    mt-[5px]
                                    text-[15px]
                                    text-[#92929B]
                                "
              >
                Faylı sürükləyin və ya klikləyin
              </p>
            </>
          )}

          <p
            className="
                            mt-[12px]
                            text-[12px]
                            text-[#AAAAAF]
                        "
          >
            PDF, DOC və DOCX • Maksimum 10 MB
          </p>
        </div>

        {error && <ErrorMessage text={error} />}

        <div
          className="
                        mt-[23px]
                        grid
                        grid-cols-2
                        gap-[14px]
                    "
        >
          <SecondaryButton onClick={previousStep}>Geriyə</SecondaryButton>

          <PrimaryButton onClick={analyzeCv} disabled={!cvFile || isAnalyzing}>
            {isAnalyzing ? (
              <span
                className="
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                "
              >
                <Spinner />
                Analiz edilir
              </span>
            ) : (
              "CV-ni analiz et"
            )}
          </PrimaryButton>
        </div>
      </div>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| ANALYSIS SCREEN
|--------------------------------------------------------------------------
*/

function AnalysisScreen({
  analysis,
  cvFile,
  selectedPosition,
  setSelectedPosition,
  useCustomPosition,
  setUseCustomPosition,
  customPosition,
  setCustomPosition,
  createAccount,
  isCreatingAccount,
  previousStep,
  resetCv,
  error,
}) {
  return (
    <>
      <ScreenTitle
        title="CV analizi hazırdır"
        description="Məlumatları nəzərdən keçirin və müsahibə keçmək istədiyiniz vəzifəni seçin."
      />

      <div
        className="
                    mt-[28px]
                    max-h-[560px]
                    space-y-[16px]
                    overflow-y-auto
                    pr-[4px]
                "
      >
        {/* FILE */}

        <div
          className="
                        flex
                        items-center
                        justify-between
                        rounded-[4px]
                        border
                        border-[#E4E4E8]
                        bg-[#FAFAFB]
                        px-[16px]
                        py-[13px]
                    "
        >
          <div
            className="
                            min-w-0
                        "
          >
            <p
              className="
                                text-[15px]
                                uppercase
                                tracking-[0.08em]
                                text-[#A0A0A8]
                            "
            >
              CV
            </p>

            <p
              className="
                                mt-[3px]
                                truncate
                                text-[15px]
                                font-semibold
                                text-[#33375B]
                            "
            >
              {cvFile?.name}
            </p>
          </div>

          <button
            type="button"
            onClick={resetCv}
            className="
                            ml-4
                            shrink-0
                            text-[10px]
                            font-medium
                            text-[#33375B]
                            hover:underline
                        "
          >
            Dəyiş
          </button>
        </div>

        {/* EXPERIENCE */}

        <ResultBlock title="Təcrübə səviyyəsi">
          <span
            className="
                            inline-flex
                            rounded-[3px]
                            bg-[#33375B]
                            px-[10px]
                            py-[6px]
                            text-[14px]
                            font-semibold
                            capitalize
                            text-white
                        "
          >
            {analysis?.experience_level}
          </span>
        </ResultBlock>

        {/* TECH */}

        <ResultBlock title="Texniki bacarıqlar">
          <TagList values={analysis?.technical_skills} />
        </ResultBlock>

        {/* SOFT */}

        <ResultBlock title="Yumşaq bacarıqlar">
          <TagList values={analysis?.soft_skills} />
        </ResultBlock>

        {/* POSITIONS */}

        <ResultBlock title="Uyğun vəzifələr">
          <p
            className="
                            mb-[12px]
                            text-[15px]
                            leading-[1.5]
                            text-[#85858F]
                        "
          >
            Müsahibə sualları seçdiyiniz vəzifəyə əsasən hazırlanacaq.
          </p>

          <div
            className="
                            space-y-[8px]
                        "
          >
            {analysis?.suggested_positions?.map((position) => (
              <PositionOption
                key={position}
                label={position}
                checked={!useCustomPosition && selectedPosition === position}
                onClick={() => {
                  setUseCustomPosition(false);

                  setSelectedPosition(position);
                }}
              />
            ))}

            <PositionOption
              label="Digər vəzifə"
              checked={useCustomPosition}
              onClick={() => {
                setUseCustomPosition(true);

                setSelectedPosition("");
              }}
            />

            {useCustomPosition && (
              <input
                autoFocus
                type="text"
                value={customPosition}
                onChange={(event) => setCustomPosition(event.target.value)}
                placeholder="Vəzifənizi daxil edin"
                className="
                                    h-[39px]
                                    w-full
                                    rounded-[3px]
                                    border
                                    border-[#DCDCE2]
                                    bg-white
                                    px-[12px]
                                    text-[11px]
                                    text-[#33375B]
                                    outline-none
                                    placeholder:text-[#A5A5AD]
                                    focus:border-[#33375B]
                                "
              />
            )}
          </div>
        </ResultBlock>
      </div>

      {error && <ErrorMessage text={error} />}

      <div
        className="
                    mt-[22px]
                    grid
                    grid-cols-2
                    gap-[14px]
                "
      >
        <SecondaryButton onClick={previousStep} disabled={isCreatingAccount}>
          Geriyə
        </SecondaryButton>

        <PrimaryButton onClick={createAccount} disabled={isCreatingAccount}>
          {isCreatingAccount ? (
            <span
              className="
                                flex
                                items-center
                                justify-center
                                gap-2
                            "
            >
              <Spinner />
              Gözləyin
            </span>
          ) : (
            "Qeydiyyatdan keç"
          )}
        </PrimaryButton>
      </div>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| SCREEN TITLE
|--------------------------------------------------------------------------
*/

function ScreenTitle({ title, description }) {
  return (
    <div
      className="
                text-center
            "
    >
      <h1
        className="
                    font-chakra
                    text-[29px]
                    font-medium
                    leading-[1.2]
                    tracking-[-0.025em]
                    text-[#33375B]
                "
      >
        {title}
      </h1>

      <p
        className="
                    mx-auto
                    mt-[8px]
                    max-w-[320px]
                    text-[15px]
                    leading-[1.5]
                    text-[#787881]
                "
      >
        {description}
      </p>
    </div>
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
                block
            "
    >
      <span
        className="
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
| BUTTONS
|--------------------------------------------------------------------------
*/

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`
                h-[43px]
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
                ${className}
            `}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`
                h-[43px]
                rounded-[3px]
                border
                border-[#33375B]
                bg-white
                px-[10px]
                text-[11px]
                font-medium
                text-[#33375B]
                transition
                hover:bg-[#F7F7FA]
                disabled:opacity-50
                ${className}
            `}
    >
      {children}
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| ERROR
|--------------------------------------------------------------------------
*/

function ErrorMessage({ text }) {
  return (
    <div
      className="
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
      {text}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| RESULT BLOCK
|--------------------------------------------------------------------------
*/

function ResultBlock({ title, children }) {
  return (
    <section
      className="
                rounded-[4px]
                border
                border-[#E6E6EA]
                bg-white
                p-[15px]
            "
    >
      <h3
        className="
                    mb-[11px]
                    text-[15px]
                    font-semibold
                    text-[#33375B]
                "
      >
        {title}
      </h3>

      {children}
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| TAG LIST
|--------------------------------------------------------------------------
*/

function TagList({ values = [] }) {
  if (!values?.length) {
    return (
      <span
        className="
                    text-[15px]
                    text-[#9999A1]
                "
      >
        Məlumat tapılmadı
      </span>
    );
  }

  return (
    <div
      className="
                flex
                flex-wrap
                gap-[6px]
            "
    >
      {values.map((value) => (
        <span
          key={value}
          className="
                            rounded-[3px]
                            bg-[#F1F1F5]
                            px-[8px]
                            py-[5px]
                            text-[12px]
                            font-medium
                            text-[#55566D]
                        "
        >
          {value}
        </span>
      ))}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| POSITION OPTION
|--------------------------------------------------------------------------
*/

function PositionOption({ label, checked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
                flex
                w-full
                items-center
                gap-[10px]
                rounded-[3px]
                border
                px-[11px]
                py-[10px]
                text-left
                transition
                ${
                  checked
                    ? "border-[#33375B] bg-[#F6F6F9]"
                    : "border-[#E3E3E8] bg-white hover:border-[#BFC0CD]"
                }
            `}
    >
      <span
        className={`
                    flex
                    h-[15px]
                    w-[15px]
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border
                    ${checked ? "border-[#33375B]" : "border-[#C9C9D0]"}
                `}
      >
        {checked && (
          <span
            className="
                            h-[7px]
                            w-[7px]
                            rounded-full
                            bg-[#33375B]
                        "
          />
        )}
      </span>

      <span
        className="
                    text-[10px]
                    font-medium
                    text-[#3B3C50]
                "
      >
        {label}
      </span>
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| ICONS
|--------------------------------------------------------------------------
*/

function CheckSmallIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4" />

      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />

      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
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

/*
|--------------------------------------------------------------------------
| FILE SIZE
|--------------------------------------------------------------------------
*/

function formatFileSize(bytes) {
  if (!bytes) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default Register;
