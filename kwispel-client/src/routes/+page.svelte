<script lang="ts">
    import loadingImg from "../assets/loading.gif";
    import doneImg from "../assets/checkmark.png";

    import { io } from "socket.io-client";
    import type { Gast } from "$lib/Gast";
    import { standaardKwis, type Kwis } from "$lib/Kwis";

    $: spelers = [] as Gast[];

    function ageer<T>(id: string, functie: (gast: Gast) => T): T {
        let matchendeIds = spelers.filter((gast) => gast.id === id);
        if (matchendeIds.length === 1) {
            return functie(matchendeIds[0]);
        } else {
            throw Error(`[ERROR] meerdere gasten met id ${id} gevonden.`);
        }
    }

    const socket = io("localhost:3141");

    $: actieveVerbinding = false;

    socket.on("connect", () => {
        actieveVerbinding = true;
    });
    socket.on("disconnect", () => {
        actieveVerbinding = false;
    });

    $: admin = false;

    socket.on("adminKennisgeving", () => {
        admin = true;
    });

    socket.on("nieuweSpelerKennisgeving", (id: string) => {
        console.log("nieuwe speler gejoind");
        spelers = [
            ...spelers,
            { admin: false, naam: undefined, huidigeAntwoord: undefined, id },
        ];
    });

    socket.on(
        "spelerAntwoordKennisgeving",
        (id: string, huidigAntwoord: any) => {
            console.log(`speler ${id} gaf antwoord ${huidigAntwoord}`);
            spelers = ageer(id, (speler) => {
                speler.huidigeAntwoord = huidigAntwoord;
                return spelers;
            });
        }
    );

    $: teamNaamGekozen = false;
    $: teamNaam = "";

    socket.on("naamRegistratieKennisgeving", (id: string, naam: string) => {
        spelers = ageer(id, (speler) => {
            speler.naam = naam;
            return spelers;
        });
    });

    $: lokaleKwis = standaardKwis;

    socket.on("kwisUpdate", (nieuweStatus: Kwis) => {
        console.log("kwis update ontvangen");
        console.log(nieuweStatus);
        lokaleKwis = nieuweStatus;
        tekstPlaceholders = extraheerPlaceholders();
    });

    function registreerNaam() {
        socket.emitWithAck("registreerNaam", teamNaam).then(() => {
            teamNaamGekozen = true;
        });
    }

    function startKwis() {
        console.log("kwis aan het starten");
        socket.emit("startKwis");
    }

    let antwoordVerstuurd = false;

    let tekstPlaceholders = [] as number[];
    let tekstInvoeren = [] as string[];

    function extraheerPlaceholders(): number[] {
        let tekst = lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].tekst;
        let placeholders = [];
        tekstInvoeren = [];
        let index = 0;

        for (let _ in tekst.match(/{}/g)) {
            console.log("found match, index nu", index);
            tekstInvoeren[index] = "";
            placeholders.push(index);
            index++;
        }

        console.log(tekst);
        console.log(placeholders);
        console.log(tekstInvoeren);

        return placeholders;
    }

    function verstuurAntwoord() {
        antwoordVerstuurd = true;
        if (lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort === "tekst") {
            console.log(tekstInvoeren);
            socket.emit("verstuurAntwoord", tekstInvoeren);
        }
    }
</script>

<div class="bg-blue-100 w-screen h-screen overflow-hidden p-16">
    <h1 class="text-3xl font-bold mb-6">kwispel</h1>
    {#if actieveVerbinding}
        <p class="mb-4">Verbonden met de spelserver: {socket.id}</p>

        {#if admin}
            {#if lokaleKwis.fase == "nogNietBegonnen"}
                <h2 class="text-xl">Welkom, admin.</h2>
                <div class="flex flex-col bg-white rounded-md p-6 gap-3">
                    <h3 class="text-lg">Verbonden spelers</h3>
                    <hr class="mb-2" />
                    {#key spelers}
                        {#each spelers as speler}
                            <p>{speler.id} heet {speler.naam}</p>
                        {/each}
                        {#if spelers.length >= 2}
                            <button
                                class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                                on:click={startKwis}>Start kwis</button
                            >
                        {/if}
                    {/key}
                </div>
            {:else if lokaleKwis.fase == "antwoordenVerzamelen"}
                <div class="flex flex-col gap-6">
                    <div
                        id="vraagstelling"
                        class="basis-1/3 rounded-md bg-white shadow-md p-6 flex flex-row items-center justify-center"
                    >
                        <h2
                            class="text-3xl font-bold text-blue-800 drop-shadow-sm"
                        >
                            {lokaleKwis.vragen[
                                lokaleKwis.huidigeVraagIdx
                            ].tekst.replaceAll("{}", "_____")}
                        </h2>
                    </div>
                    <div class="columns-2 p-6 basis-2/3">
                        {#each spelers as speler}
                            <div
                                class="bg-blue-200 rounded-md p-4 mb-4 flex flex-row justify-between"
                            >
                                <h3 class="text-xl">{speler.naam}</h3>
                                <img
                                    class="w-8 aspect-square object-fit"
                                    src={speler.huidigeAntwoord === undefined
                                        ? loadingImg
                                        : doneImg}
                                    alt={"een laadicoontje"}
                                />
                            </div>
                        {/each}
                    </div>
                </div>
            {:else if lokaleKwis.fase == "antwoordenPresenteren"}
                <div>
                    <p>TODO</p>
                </div>
            {/if}
        {:else if !teamNaamGekozen}
            <div
                class="bg-white rounded-md shadow-md p-4 flex flex-col max-w-min gap-4"
            >
                <p>Kies een teamnaam.</p>
                <input
                    bind:value={teamNaam}
                    placeholder="De Kwiskundigen"
                    class="p-3 border rounded-sm border-blue-800"
                />
                <br />
                <button
                    class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                    on:click={registreerNaam}>Registreer!</button
                >
            </div>
        {:else if lokaleKwis.fase == "nogNietBegonnen"}
            <h3 class="text-xl mb-3">Welkom, <b>{teamNaam}</b>.</h3>
            <p>Het is nu een kwestie van wachten tot de kwis van start gaat.</p>
        {:else if lokaleKwis.fase == "antwoordenVerzamelen"}
            <h3 class="text-xl mb-3">
                Tijd om een antwoord te verzinnen, <b>{teamNaam}</b>.
            </h3>
            {#if antwoordVerstuurd}
                <p>
                    Bedankt voor je antwoord! Nu is het wachten tot de rest
                    klaar is.
                </p>
            {:else if lokaleKwis.vragen[lokaleKwis.huidigeVraagIdx].soort == "tekst"}
                <div class="flex flex-col gap-4">
                    {#each tekstPlaceholders as item}
                        <input
                            class="w-full rounded-md border p-3"
                            placeholder="uw moeder"
                            bind:value={tekstInvoeren[item]}
                        />
                    {/each}
                    <button
                        class="rounded-md text-white bg-blue-500 p-3 hover:bg-blue-800 transition-all"
                        on:click={verstuurAntwoord}>Dien antwoord in</button
                    >
                </div>
            {/if}
        {/if}
    {:else}
        <p>
            Niet verbonden. De spelserver kan offline zijn, of je bent zelf
            offline. Geen idee tbh.
        </p>
    {/if}
</div>
