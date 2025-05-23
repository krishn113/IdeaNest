import React, { useContext, useState, useRef, useEffect } from 'react'
import logo from "../imgs/logo.png";
import {Link, Outlet} from "react-router-dom";
import { UserContext } from '../App';
import { removeFromSession } from '../common/session';
const Navbar = () => {

  const [searchBoxVisibility, setSearchBoxVisibility] = useState(false)
  const {userAuth, userAuth: {access_token, profile_img, username}, setUserAuth} = useContext(UserContext);

  const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef();

    useEffect(() => {
    const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
    }, []);


  const signOutUser = () => {
    removeFromSession("user");
    setUserAuth({access_token: null})
  }

  return (
    <>
    <nav className="navbar">
        <Link to="/" className='flex-none w-10'>
        <img src={logo} className='flex-none w-10'/>
        </Link>

        <div className={'absolute bg-white w-full left-0 top-full mt-0.5 border-b border-grey py-4 px-[5vw] md:border-0 md:block md:relative md:inset-0 md:p-0 md:w-auto md:show ' + (searchBoxVisibility ? "show" : "hide")}>
            <input
                type="text"
                placeholder='Search'
                className='w-full md:w-auto bg-grey p-4 pl-6 pr-[12%] md:pr-6 rounded-full placeholder:text-dark-grey md:pl-12'
            />
            <i className="fi fi-rr-search absolute right-[10%]
            md:pointer-events-none md:left-5 top-1/2 -translate-y-1/2 text-xl text-dark-grey"></i>
        </div>
        <div className='flex item-center gap-3 md:gap-6 ml-auto'>
            <button className='md:hidden bg-grey w-12 h-12 rounded-full flex items-center justify-center'
            onClick={() => setSearchBoxVisibility(currentVal => !currentVal)}>
                <i className='fi fi-rr-search text-xl'></i>
            </button>
            <Link to="/editor" className='hidden md:flex gap-2 link'>
            <i className='fi fi-rr-file-edit'></i>
            <p>Write</p>
            </Link>

            {
                access_token ? (
                    <div className="relative" ref={menuRef}>
                    <button
                        className="w-12 h-12 mt-1"
                        onClick={() => setShowMenu((prev) => !prev)}
                    >
                        <img
                        src={profile_img}
                        alt="profile"
                        className="w-full h-full object-cover rounded-full"
                        />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md z-50">
                        <Link
                            to="/dashboard/blogs"
                            className="block px-4 py-3 text-sm text-black hover:bg-gray-100"
                            onClick={() => setShowMenu(false)}
                        >
                            Dashboard
                        </Link>

                        <button
                            onClick={() => {
                            signOutUser();
                            setShowMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100"
                        >
                            <h1 className="font-bold text-black">Sign Out</h1>
                            <p className="text-dark-grey text-sm">@{username}</p>
                        </button>
                        </div>
                    )}
                    </div>

                )
                :
                <>
                    <Link to="/signin" className='btn-dark py-2'>
                    SignIn
                    </Link>
                    <Link to="/signup" className='btn-light py-2 md:block'>
                    SignUp
                    </Link>
                </>
            }
        </div>
    </nav>
    <Outlet/>
    </>
  )
}

export default Navbar;
