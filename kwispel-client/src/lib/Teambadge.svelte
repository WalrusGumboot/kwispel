<script lang="ts">
    import type { Richting } from "./Gast";

    export let richting: Richting;
</script>

{#if richting == "Wiskunde"}
    <div class="px-3 py-2 rounded-md text-white bg-wiskunde-500 max-w-min">Wiskunde</div>
{:else if richting == "Fysica"}
    <div class="px-3 py-2 rounded-md text-white bg-fysica-500 max-w-min">Fysica</div>
{/if}