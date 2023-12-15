export type Richting = "Wiskunde" | "Fysica" | undefined

export type Gast = {
    id: string,
    admin: boolean,
    naam: string | undefined,
    punten: number,
    richting: Richting
}