<script lang="ts">
    import type { Richting } from "./Gast";
    import { knopStijl } from "./Stijlen";

    export let spelerRichting: Richting;

    export let dataOntvangenCallback: (data: string) => void;

    let geüploadeBestanden: any;
    let geüploadeFoto: string;
    

    let fotoInput: HTMLInputElement;

    function alsBase64(foto: Blob) {
        const reader = new FileReader();
        reader.readAsDataURL(foto);
        reader.onload = (e) => {
            geüploadeFoto = e.target?.result?.toString()!
        }
    }
</script>

<div class="p-6 bg-white min-w-max flex flex-col gap-4 justify-stretch">
    <h1 class="text-2xl">Upload een foto!</h1>
    {#if geüploadeFoto}
        <img alt="geüploade foto" class="w-max" src={geüploadeFoto}/>
    {:else}
        <div class="w-max h-16 min-w-max min-h-max bg-slate-200 rounded-sm flex flex-col items-center align-center justify-center">
            <p class="text-slate-800 text-lg">Geen foto gekozen.</p>
        </div>
    {/if}
    <input
        class="hidden"
        bind:files={geüploadeBestanden}
        bind:this={fotoInput}
        on:change={() => alsBase64(geüploadeBestanden[0])}
        accept=".jpg, .png, .jpeg, .JPEG, .JPG, .PNG"
        type="file"
    />
    <button
        class={knopStijl.get(spelerRichting)}
        on:click={() => {
            fotoInput.click();
        }}>
            {geüploadeFoto ? "Kies een andere foto" : "Kies een foto"}
            {#if geüploadeFoto}
                <button class={knopStijl.get(spelerRichting)} on:click={() => {dataOntvangenCallback(geüploadeFoto)}}>verstuur antwoord</button>
            {/if}
        </button
    >
</div>
