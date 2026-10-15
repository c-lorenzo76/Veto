import { VetoWordmark } from "@/components/VetoWordmark";

export function Navbar({ user, avatar }) {

    return (

        <nav className="flex mx-auto px-6 py-5 bg-surface border border-surface-border shadow-md rounded-3xl w-[90%] lg:w-[80%]">
            <div className="flex items-center justify-between w-full">
                <a href="#" className="flex items-center">
                    <VetoWordmark size="sm" onDark={false} />
                </a>
                {!!user && (
                    <div className="flex flex-row items-center">
                        <span className="mr-4 text-lg font-semibold text-brand-ink">{user}</span>
                        <img
                            alt="User settings"
                            src={avatar}
                            className="rounded-full h-10 w-10 object-cover border border-surface-border"
                        />
                    </div>
                )}
            </div>
        </nav>

    )
}



        // <nav className="flex mx-auto items-center justify-between p-5 bg-surface rounded-3xl w-full lg:w-[80%]">
        //     <a href="#" className="flex items-center">
        //         <span className="self-center whitespace-nowrap text-xl text-gray-700 font-semibold dark:text-gray-600">
        //             Veto
        //         </span>
        //     </a>
        //     {!!user && (
        //         <div className="flex flex-row items-center">
        //             <span className="mr-4 text-lg">{user}</span>
        //             <img
        //                 alt="User settings"
        //                 src={avatar}
        //                 className="rounded-full h-10 w-10 object-cover border border-surface-border"
        //             />
        //         </div>
        //     )}
        // </nav>

