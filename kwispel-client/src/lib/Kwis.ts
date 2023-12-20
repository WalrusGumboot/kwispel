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
    "stemresulatenPresenteren" |
    "beëindigd"
}

export const PUNTEN_PER_STEM = 100;

export const standaardKwis: Kwis = {
    vragen: [
        { soort: "tekst", tekst: "Eigenlijk schudt Vaes altijd met z'n krijtje omdat {}." },
        { soort: "foto",  tekst: "Vaes' gezicht wanneer Sam vraagt hoe dat dat zit bij oneindigdimensionale vectorruimtes:" },
        { soort: "tekst", tekst: "Als we {} dan zal Leen gegarandeerd op tijd klaarkomen." },
        { soort: "tekst", tekst: "Arno Kuijlaars' standaard pickup line is: '{}'" },
        { soort: "tekst", tekst: "Ik gebruik mijn Giancoli meestal voor {}." },
        { soort: "tekst", tekst: "De Rony Keppens 3000 text-to-speech bot mist één belangrijke functie: {}." },
    ],
    huidigeVraagIdx: 0,
    fase: "nogNietBegonnen"
}