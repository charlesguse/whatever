<script lang="ts">
  let canvas: HTMLCanvasElement | undefined = $state();
</script>

<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    display: block;
    width: 100vw;
    height: 100vh;
  }
</style>
