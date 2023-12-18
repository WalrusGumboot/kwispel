<script lang="ts">
    import type { Richting } from "./Gast";
    import { knopStijl } from "./Stijlen";

    export let spelerRichting: Richting;

    let geüploadeBestanden: any;
    let geüploadeFoto: string | undefined;
    

    let fotoInput: HTMLInputElement;

    function alsBase64(foto: Blob) {
        const reader = new FileReader();
        reader.readAsDataURL(foto);
        reader.onload = (e) => {
            geüploadeFoto = e.target?.result?.toString()
        }
    }
</script>

<div class="p-4 bg-white">
    {#if geüploadeFoto}
        <img alt="geüploade foto" class="w-16" src={geüploadeFoto}/>
    {:else}
        <div class="w-16 h-16 min-w-max min-h-max bg-slate-200 rounded-sm flex flex-col items-center align-center justify-center">
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
        }}>Kies een foto</button
    >
</div>
