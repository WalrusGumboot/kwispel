<script lang="ts">
    import { io } from "socket.io-client";
    import type { Gast } from "$lib/Gast.ts";

    $: actieveVerbinding = false;
    $: admin = false;
    let spelers: Gast[] = [];
    $: spelers;

    function ageer<T>(id: string, functie: (gast: Gast) => T): T {
        let matchendeIds = spelers.filter((gast) => gast.id === id);
        if (matchendeIds.length === 1) {
            return functie(matchendeIds[0]);
        } else {
            throw Error(`[ERROR] meerdere gasten met id ${id} gevonden.`);
        }
}

    const socket = io("localhost:3141");

    socket.on("connect", () => {
        actieveVerbinding = true;
    });
    socket.on("disconnect", () => {
        actieveVerbinding = false;
    });
    socket.on("adminKennisgeving", () => {
        admin = true;
    });

    socket.on("nieuweSpelerKennisgeving", (id: string) => {
        spelers.push({ admin: false, naam: undefined, id });
    });

    socket.on("naamRegistratieKennisgeving", (id: string, naam: string) => {
        ageer(id, (speler) => speler.naam = naam);
    })

    $: teamNaamGekozen = false;
    $: teamNaam = "";

    function registreerNaam() {
        socket.emitWithAck("registreerNaam", teamNaam).then(() => {
            teamNaamGekozen = true;
        });
    }
</script>

<div class="bg-blue-100 w-screen h-screen overflow-hidden p-16">
    <h1 class="text-3xl font-bold mb-6">kwispel</h1>
    {#if actieveVerbinding}
        <p class="mb-4">Verbonden met de spelserver: {socket.id}</p>

        {#if admin}
            <h2 class="text-xl">Welkom, admin.</h2>
            <div class="flex flex-col bg-white rounded-md p-6 gap-3">
                <h3 class="text-lg">Verbonden spelers</h3>
                <hr class="mb-2">
                {#each spelers as speler}
                    <p>{speler.id} heet {speler.naam}</p>
                {/each}
            </div>
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
                    class="rounded-md text-white bg-blue-500 p-3"
                    on:click={registreerNaam}>Registreer!</button
                >
            </div>
        {:else}
            <h3 class="text-xl">Welkom, <b>{teamNaam}</b>.</h3>
        {/if}
    {:else}
        <p>
            Niet verbonden. De spelserver kan offline zijn, of je bent zelf
            offline. Geen idee tbh.
        </p>
    {/if}
</div>
