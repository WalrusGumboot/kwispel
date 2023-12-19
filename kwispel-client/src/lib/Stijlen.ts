import type { Richting } from "./Gast";

type Stijl = Map<Richting, string>;

export const achtergrondStijl: Stijl = new Map([
    [undefined, "bg-blue-100 w-screen min-h-screen overflow-hidden p-16"],
    ["Wiskunde", "bg-wiskunde-100 w-screen min-h-screen overflow-hidden p-16"],
    ["Fysica", "bg-fysica-100 w-screen min-h-screen overflow-hidden p-16"],
])

export const knopStijl: Stijl = new Map([
    [undefined, "rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"],
    ["Wiskunde", "rounded-md text-white bg-wiskunde-500 p-3 hover:bg-wiskunde-800 transition-all"],
    ["Fysica", "rounded-md text-white bg-fysica-500 p-3 hover:bg-fysica-800 transition-all"],
])

export const antwoordStemKnopStijl: Stijl = new Map([
    [undefined, "bg-white rounded-md hover:bg-blue-500 text-blue-800 hover:text-white transition-all p-4 disabled:bg-gray-300 disabled:text-gray-800"],
    ["Wiskunde", "bg-white rounded-md hover:bg-wiskunde-500 text-wiskunde-800 hover:text-white transition-all p-4 disabled:bg-gray-300 disabled:text-gray-800"],
    ["Fysica", "bg-white rounded-md hover:bg-fysica-500 text-fysica-800 hover:text-white transition-all p-4 disabled:bg-gray-300 disabled:text-gray-800"],
])

export const headingStijl: Stijl = new Map([
    [undefined, "text-2xl font-bold text-blue-800 mb-6"],
    ["Wiskunde", "text-2xl font-bold text-wiskunde-800 mb-6"],
    ["Fysica", "text-2xl font-bold text-fysica-800 mb-6"],
])

export const eigenSpelerStijl: Stijl = new Map([
    [undefined, "bg-amber-200 p-4 rounded-md"],
    ["Wiskunde", "bg-wiskunde-200 p-4 rounded-md"],
    ["Fysica", "bg-fysica-200 p-4 rounded-md"],
])