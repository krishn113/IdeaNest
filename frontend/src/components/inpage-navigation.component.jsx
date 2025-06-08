import { useEffect, useRef, useState } from "react";

const InPageNavigation = ({ routes,defaultHidden = [], children}) => {
    const activeTabLineRef = useRef();
    const buttonRefs = useRef([]);
    const [inPageNavIndex, setInPageNavIndex] = useState(0);

    const changePageState = (btn, i) => {
        if (btn && activeTabLineRef.current) {
            const { offsetWidth, offsetLeft } = btn;
            activeTabLineRef.current.style.width = `${offsetWidth}px`;
            activeTabLineRef.current.style.left = `${offsetLeft}px`;
            setInPageNavIndex(i);
        }
    };

    useEffect(() => {
        const initialBtn = buttonRefs.current[inPageNavIndex];
        if (initialBtn) changePageState(initialBtn, inPageNavIndex);
    }, []);

    return (
        <>
        <div className="relative mb-8 border-b bg-white border-grey flex flex-nowrap overflow-x-auto">
            {routes.map((route, i) => (
                <button
                    key={i}
                    ref={el => (buttonRefs.current[i] = el)}
                    className={`p-4 px-5 capitalize ${inPageNavIndex === i ? "text-black " : "text-grey "}` + (defaultHidden.includes(route) ? " md:hidden" : "")}
                    onClick={e => changePageState(e.target, i)}
                >
                    {route}
                </button>
            ))}

            <hr ref={activeTabLineRef} className="absolute bottom-0 border-black border-t-2" />
        </div>
        {Array.isArray(children) ? children[inPageNavIndex] : children}
        </>
    );
};

export default InPageNavigation;
