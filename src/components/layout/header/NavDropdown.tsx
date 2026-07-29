"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { NavMenu } from "./types";
import { getSectionClasses } from "./color-utils";
import NavSubPanel from "./NavSubPanel";

interface NavDropdownProps {
    menu: NavMenu;
    isActive: boolean;
    isOpen: boolean;
    subPanelKey: string | null;
    onMenuEnter: () => void;
    onMenuLeave: () => void;
    onDropdownEnter: () => void;
    onDropdownLeave: () => void;
    onSubPanelKeyChange: (key: string | null) => void;
    isItemActive: (href: string) => boolean;
}

export default function NavDropdown({
    menu,
    isActive,
    isOpen,
    subPanelKey,
    onMenuEnter,
    onMenuLeave,
    onDropdownEnter,
    onDropdownLeave,
    onSubPanelKeyChange,
    isItemActive,
}: NavDropdownProps) {
    const highlighted = isActive || isOpen;
    const router = useRouter();

    return (
        <div className="relative flex items-stretch" onMouseEnter={onMenuEnter} onMouseLeave={onMenuLeave}>
            <button
                className={`
                    relative flex items-center gap-1.5 px-3 text-sm font-medium
                    transition-colors duration-150 rounded-md my-1.5
                    ${highlighted ? "text-white bg-white/[0.08]" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"}
                `}
            >
                {menu.label}
                <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180 text-slate-300" : ""}`}
                />
                {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-blue-500" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-[calc(100%+4px)] left-0 flex bg-[#111827] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50"
                        onMouseEnter={onDropdownEnter}
                        onMouseLeave={() => {
                            onDropdownLeave();
                            onSubPanelKeyChange(null);
                        }}
                    >
                        {/* Left: menu list */}
                        <div style={{ minWidth: "300px" }}>
                            {menu.sections.map((section) => {
                                const { badgeClass, activeIconClass, activeDotClass, activeRowClass } =
                                    getSectionClasses(section.color ?? "blue");

                                return (
                                    <div key={section.section}>
                                        <div className="px-2 pt-3 pb-2">
                                            <div className="flex items-center gap-2 px-2.5 mb-2">
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md select-none ${badgeClass}`}
                                                >
                                                    {section.section}
                                                </span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {section.items.map((item) => {
                                                    const itemActive = isItemActive(item.href);
                                                    const hasSubPanel = !!item.subPanel;
                                                    const isSubOpen = subPanelKey === item.href;

                                                    const rowClass = isSubOpen
                                                        ? "bg-violet-500/10 text-white"
                                                        : itemActive
                                                          ? activeRowClass
                                                          : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100";

                                                    const iconClass = isSubOpen
                                                        ? "bg-violet-500/20 text-violet-400"
                                                        : itemActive
                                                          ? activeIconClass
                                                          : "bg-white/[0.06] text-slate-500 group-hover/item:bg-white/10 group-hover/item:text-slate-300";

                                                    const innerContent = (
                                                        <>
                                                            <div
                                                                className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors duration-100 ${iconClass}`}
                                                            >
                                                                <item.icon className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p
                                                                    className={`text-sm font-medium leading-tight ${itemActive || isSubOpen ? "text-white" : ""}`}
                                                                >
                                                                    {item.label}
                                                                </p>
                                                                {item.description && (
                                                                    <p className="text-xs text-slate-600 mt-0.5 leading-tight truncate">
                                                                        {item.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {hasSubPanel ? (
                                                                <ChevronRight
                                                                    className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-100 ${isSubOpen ? "text-violet-400" : "text-slate-600"}`}
                                                                />
                                                            ) : itemActive ? (
                                                                <span
                                                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeDotClass}`}
                                                                />
                                                            ) : null}
                                                        </>
                                                    );

                                                    return (
                                                        <div
                                                            key={item.label}
                                                            onMouseEnter={() => {
                                                                onSubPanelKeyChange(hasSubPanel ? item.href : null);
                                                                // Prefetch trang khi hover để load nhanh hơn khi click
                                                                if (!hasSubPanel && item.href) {
                                                                    router.prefetch(item.href);
                                                                }
                                                            }}
                                                        >
                                                            {hasSubPanel ? (
                                                                /* Item có sub-panel: render div, không navigate */
                                                                <div
                                                                    className={`group/item flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-100 cursor-default ${rowClass}`}
                                                                >
                                                                    {innerContent}
                                                                </div>
                                                            ) : item.external ? (
                                                                <a
                                                                    href={item.href}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`group/item flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-100 ${rowClass}`}
                                                                >
                                                                    {innerContent}
                                                                </a>
                                                            ) : (
                                                                <Link
                                                                    href={item.href}
                                                                    className={`group/item flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors duration-100 ${rowClass}`}
                                                                >
                                                                    {innerContent}
                                                                </Link>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="mx-3 border-t border-white/[0.05]" />
                                    </div>
                                );
                            })}

                            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02]">
                                <span className="text-xs text-slate-600">Video Intelligence Platform</span>
                                <span className="text-xs bg-white/[0.06] text-slate-500 px-1.5 py-0.5 rounded-md">
                                    Beta
                                </span>
                            </div>
                        </div>

                        {/* Right: SubPanel flyout */}
                        {(() => {
                            const subItem = menu.sections
                                .flatMap((s) => s.items)
                                .find((i) => i.href === subPanelKey && i.subPanel);
                            if (!subItem) return null;
                            return (
                                <NavSubPanel
                                    item={subItem}
                                    onMouseEnter={() => onSubPanelKeyChange(subItem.href)}
                                />
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
