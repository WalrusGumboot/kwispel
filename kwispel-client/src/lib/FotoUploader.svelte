<script lang="ts">
    import type { Richting } from "./Gast";
    import { knopStijl } from "./Stijlen";

    export let spelerRichting: Richting;

    export let dataOntvangenCallback: (data: string) => void;

    let geüploadeBestanden: FileList;
    let geüploadeFoto: string;

    let fotoInput: HTMLInputElement;

    function alsBase64(foto: Blob) {
        // file size check
        if (geüploadeBestanden[0].size > 4 * 1024 * 1024) {
            alert("Deze foto is groter dan 4 MiB. Kies een foto die kleiner is.");
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(foto);
        reader.onload = (e) => {
            geüploadeFoto = e.target?.result?.toString()!;
            console.log(geüploadeFoto)
        };
    }
</script>

<div class="p-6 bg-white max-w-screen flex flex-col gap-4 justify-stretch">
    <h1 class="text-2xl">Upload een foto!</h1>
    <input
        class="hidden"
        bind:files={geüploadeBestanden}
        bind:this={fotoInput}
        on:change={() => alsBase64(geüploadeBestanden[0])}
        accept=".jpg, .png, .jpeg, .gif, .JPG, .PNG, .JPEG, .GIF"
        type="file"
    />
    <button
        class={knopStijl.get(spelerRichting)}
        on:click={() => {
            fotoInput.click();
        }}
    >
        {geüploadeFoto ? "Kies een andere foto" : "Kies een foto"}
    </button>
    {#if geüploadeFoto}
        <button
            class={knopStijl.get(spelerRichting)}
            on:click={() => {
                dataOntvangenCallback(geüploadeFoto);
            }}>verstuur antwoord</button
        >
    {/if}

    {#if geüploadeFoto}
        <img alt="geüploade foto" class="w-max" src={geüploadeFoto} />
    {:else}
        <div
            class="p-6 min-w-max bg-slate-200 rounded-sm flex flex-col items-center align-center justify-center"
        >
            <p class="text-slate-800 text-lg">Geen foto gekozen.</p>
        </div>
    {/if}
</div>