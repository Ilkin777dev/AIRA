// Image imports
import bgImage from "../assets/main_bg.png";
import AIRA_Logo_White from "../assets/AIRA-Logo-White.png";
import XRITDX_Logo from "../assets/XRITDX-Logo.png";

// Components import
import Header from "../components/Header";
import CopyrightSign from "../components/CopyrightSign";

// Libs import
import { Link } from "react-router-dom";

function MainPage() {
    return (
      <div className="mainPage" class="h-screen flex flex-col bg-cover bg-center text-white" style={{ backgroundImage: `url(${bgImage})` }}>
        <Header />
        <div className="mainPageContent" class="h-[93vh] flex flex-col direction-column items-center justify-center">
          <div className="mainPageTitle" class="mb-12">
            <img src={AIRA_Logo_White} alt="" class />
          </div>
          <div className="mainPageDescription" class="w-[60%] text-center">
                <p className="mb-[12px]">
                    Platformamız ənənəvi HR proseslərini avtomatlaşdıran və
                    sürətləndirən yenilikçi süni intellekt həllidir. Sistem
                    namizədlərlə insan amilindən asılı olmayan, obyektiv və
                    interaktiv müsahibə seansları keçirir. Cavabları sadəcə açar
                    sözlərə görə deyil, dərin məntiqi və texniki kontekstə görə
                    təhlil edərək namizədin vakansiyaya nə dərəcədə uyğun olduğunu
                    dəqiqliklə müəyyən edir.
                </p>

                <p className="mb-[12px]">
                    * AI müsahibə zamanı namizədin verdiyi cavabların dərinliyinə
                    görə növbəti sualları formalaşdırır. zbərlənmiş şablonların
                    qarşısını alır və real biliyi üzə çıxarır.
                </p>

                <p className="mb-[12px]">
                    Müsahibədə iştirak etmək üçün zəhmət olmasa qeydiyyatdan keçin
                    və <b>"Müsahibəyə başla"</b> düyməsinə klikləyin.
                </p>

                <Link to="/register">
                    <button class="bg-white text-black my-[40px] py-[10px] px-[20px] rounded cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#C0C1CC] hover:text-white ">
                    Qeydiyyat
                    </button>
                </Link>

                <ul className="flex items-center justify-center gap-2">
                <li>
                    <a href="#" target="_blank" className="underline">Məxfilik siyasəti</a>
                </li>
                
                <li>
                    ·
                </li>

                <li>
                    <a href="#" target="_blank" className="underline">İstifadə şərtləri</a>
                </li>

                <li>
                    ·
                </li>

                <li>
                    <a href="#" target="_blank" className="underline">İmtahan qaydaları</a>
                </li>
                </ul>
          </div>
        </div>

        <CopyrightSign />
      </div>
    );
}

export default MainPage;