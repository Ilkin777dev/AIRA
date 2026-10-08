// Image imports
import Logo from "../assets/XRITDX-Logo.png";

// Libs imports
import { Link } from "react-router-dom";

export default function Header() {
    return(
        <div className="headerWrapper" class="">
            <header class="w-[90%] mx-auto pt-2.5 flex justify-between items-center">
                <div className="headerLeft">
                    <img src={Logo} alt="" class="w-[300px]" />
                </div>
                <div className="headerRight">
                    <Link to="/login" className="mr-[20px]">
                        <button class="bg-white text-black py-[10px] px-[20px] rounded cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#C0C1CC] hover:text-white ">Daxil ol</button>
                    </Link>
                    {/* <Link to="/register">
                        <button class="bg-white text-black py-[10px] px-[20px] rounded cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#C0C1CC] hover:text-white ">Qeydiyyat</button>
                    </Link> */}
                </div>
            </header>
        </div>
    );
}