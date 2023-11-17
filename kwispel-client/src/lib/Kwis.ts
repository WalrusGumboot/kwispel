export type Vraag = {
    soort: "tekst" | "foto" | "geluid",
    tekst: string
}

export type Kwis = {
    vragen: Vraag[],
    huidigeVraagIdx: number,
    fase: "nogNietBegonnen" |
    "antwoordenVerzamelen" |
    "antwoordenPresenteren" |
    "stemmen" |
    "stemresulatenPresenteren"
}

export const standaardKwis: Kwis = {
    vragen: [
        { soort: "tekst", tekst: "De salamanders van Vaes be like: 'Senior, commilitones, laat ons drinken op {} en op {}!'" }
    ],
    huidigeVraagIdx: 0,
    fase: "nogNietBegonnen"
}