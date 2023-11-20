import { createServer } from "http";
import { Server } from "socket.io";
const server = createServer();

//@ts-ignore
const io = new Server(server, {
    connectionStateRecovery: {},
    cors: {
        origin: "http://localhost:5173"
    }
})
server.listen(
    3141,
    () => {
        console.log("[server geactiveerd]")
    }
)

import type { Gast } from "./kwispel-client/src/lib/Gast";
import { standaardKwis, type Kwis, PUNTEN_PER_STEM } from "./kwispel-client/src/lib/Kwis";
import type { Antwoord } from "./kwispel-client/src/lib/Antwoord";
import { sleep } from "bun";

let gasten: Gast[] = [];
let kwis: Kwis = standaardKwis;
let antwoorden: Antwoord[] = [];

function ageer<T>(id: string, functie: (gast: Gast) => T): T {
    let matchendeIds = gasten.filter((gast) => gast.id === id);
    if (matchendeIds.length === 1) {
        return functie(matchendeIds[0]);
    } else {
        throw Error(`[ERROR] meerdere gasten met id ${id} gevonden.`);
    }
}

function ageerAdmin<T>(functie: (gast: Gast) => T): T {
    let admin = gasten.find((g) => g.admin)
    if (admin !== undefined) {
        return functie(admin);
    } else {
        throw Error(`[ERROR] geen admin gevonden.`);
    }
}

function stuurNaarAdmin(ev: string, ...args: any[]) {
    ageerAdmin((admin) => { io.to(admin.id).emit(ev, ...args) });
    console.log(`   [naar admin]: ${ev} met args ${args}`)
}


function idAanwezig(id: string): boolean {
    return gasten.some((gast) => gast.id === id);
}

io.on('connection', (socket) => {
    // CONNECTIELOGICA
    console.log(`[nieuwe verbinding] ${socket.id.substring(16)}`);
    if (gasten.length === 0) {
        gasten.push({ id: socket.id, admin: true, naam: "ADMIN", punten: 0 });
        socket.emit("adminKennisgeving");
        console.log(' ↳ [admin  geregistreerd]');
    } else {
        if (idAanwezig(socket.id)) {
            console.log(' ↳ [speler al gekend, niet opnieuw geregistreerd]');
        } else {
            gasten.push({ id: socket.id, admin: false, naam: undefined, punten: 0 });
            stuurNaarAdmin("nieuweSpelerKennisgeving", socket.id);
            console.log(' ↳ [speler geregistreerd]');
        }
    }

    socket.on("disconnect", (reden) => {
        ageer(socket.id, (gast) => {
            if (reden == "ping timeout" || reden == "transport close") {
                console.log(`[verbinding weggevallen] - misschien recoverable (reden: ${reden})`)
                if (gast.admin) {
                    console.log(" ↳ [WARN] het was de adminconnectie")
                }
            } else {
                console.log(`[verbinding weggevallen] - waarschijnlijk niet recoverable (reden: ${reden})`)
                gasten = gasten.filter((g) => g !== gast);
                console.log(` ↳ [gast verwijderd] ${socket.id.substring(16)}`)
            }
        })
    })

    // NAAMREGISTRATIE
    socket.on("registreerNaam", (naam: string, callback: (ret: string) => void) => {
        ageer(socket.id, (gast) => gast.naam = naam)
        console.log(`[naam geregistreerd] voor ${socket.id.substring(16)}: "${naam}"`)
        stuurNaarAdmin("naamRegistratieKennisgeving", socket.id, naam);
        callback("naam geregistreerd.")
    })

    // KWIS START
    socket.on("startKwis", () => {
        console.log("[kwis start binnengekregen]")
        kwis.fase = "antwoordenVerzamelen";
        io.emit("kwisUpdate", kwis);
        console.log("[kwisstatus veranderd] kwis gestart");
    })

    socket.on("verstuurAntwoord", (antwoord: Antwoord) => {
        console.log(`[antwoord gekregen]: ${socket.id.substring(16)} gaf ${antwoord}`);
        antwoorden.push(antwoord)
        stuurNaarAdmin("antwoordKennisgeving", antwoord);

        if (antwoorden.length === gasten.length - 1) {
            kwis.fase = "antwoordenPresenteren";
            io.emit("kwisUpdate", kwis);
        }
    })

    socket.on("klaarVoorStemmen", () => {
        console.log("[klaar voor stemming]")
        kwis.fase = "stemmen";
        io.except(gasten.find((g) => g.admin)!.id).emit("declareerAntwoorden", antwoorden);
        io.emit("kwisUpdate", kwis)
    })

    socket.on("stem", (id: string) => {
        let antwoordIdx = antwoorden.findIndex((a) => a.spelerId == id);
        antwoorden[antwoordIdx].stemmen = antwoorden[antwoordIdx].stemmen + 1;
        stuurNaarAdmin("stemKennisgeving", id)
    })

    socket.on("puntentelling", () => {
        for (let antwoord of antwoorden) {
            gasten = ageer(antwoord.spelerId, (g) => {
                g.punten += PUNTEN_PER_STEM * antwoord.stemmen;
                return gasten;
            });
        }
        console.log("[puntentelling]")
        kwis.fase = "stemresulatenPresenteren";
        io.emit("kwisUpdate", kwis);
        io.emit("scorebord", gasten.filter((e) => !e.admin))
    })

    socket.on("volgendeVraag", () => {
        console.log("[volgende vraag]")
        kwis.fase = "antwoordenVerzamelen";
        kwis.huidigeVraagIdx += 1;
        antwoorden = []
        io.emit("kwisUpdate", kwis);
    })

    socket.on("eindigKwis", () => {
        kwis.fase = "beëindigd"
        console.log("[kwis klaar]")
    })
});

// for await (const line of console) {
//     try {
//         console.log(eval?.(line));
//     } catch (e) {
//         console.error(e)
//     }
// }