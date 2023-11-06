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

let gasten: Gast[] = []

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
    ageerAdmin((admin) => {io.to(admin.id).emit(ev, ...args)});
}


function idAanwezig(id: string): boolean {
    return gasten.some((gast) => gast.id === id);
}

io.on('connection', (socket) => {
    // CONNECTIELOGICA
    console.log(`[nieuwe verbinding] ${socket.id.substring(16)}`);
    if (gasten.length === 0) {
        gasten.push({ id: socket.id, admin: true, naam: "ADMIN" });
        socket.emit("adminKennisgeving");
        console.log(' ↳ [admin  geregistreerd]');
    } else {
        if (idAanwezig(socket.id)) {
            console.log(' ↳ [speler al gekend, niet opnieuw geregistreerd]');
        } else {
            gasten.push({ id: socket.id, admin: false, naam: undefined });
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
});