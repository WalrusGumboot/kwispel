<script lang="ts">
    import { onMount } from "svelte";

    onMount(() => {
        vraagPermissie();
    });

    function vraagPermissie() {
        videoStreamPromise = navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
            },
            audio: false
        });

        videoStreamPromise.then((stream) => {
            videoStream = stream;
        });
    }

    function srcObject(node: any) {
        node.srcObject = videoStream;
        return {
            update(_nextStream: any) {
                node.srcObject = videoStream;
            },
            destroy() {
                /* stream revoking logic here */
            },
        };
    }

    function neemFoto() {
        let cnv = document.createElement("canvas");
        const vidSettings = videoStream!.getVideoTracks()[0].getSettings();

        cnv.width = vidSettings!.width || 100;
        cnv.height = vidSettings!.height || 100;

        console.log(cnv.width, cnv.height, vidSettings);

        let ctx = cnv.getContext("2d")!;
        ctx.drawImage(handmatigVideoElem, 0, 0);

        base64enc = cnv.toDataURL("image/jpeg");
    }

    $: videoStreamPromise = undefined as Promise<MediaStream> | undefined;
    $: videoStream = undefined as MediaStream | undefined;

    let handmatigVideoElem: HTMLVideoElement;

    $: base64enc = "";
</script>

<div class="p-6 bg-white">
    {#await videoStreamPromise}
        <p>wachten op permissie</p>
    {:then}
        video:
        <!-- svelte-ignore a11y-media-has-caption -->
        <video use:srcObject autoplay bind:this={handmatigVideoElem} />
        <button on:click={neemFoto}>neem foto</button>

        <p>{base64enc}</p>
    {:catch error}
        <p>{error}</p>
        <p>{error.message}</p>
        <button class="px-4 py-2 bg-amber-400" on:click={vraagPermissie}
            >probeer opnieuw</button
        >
    {/await}
</div>