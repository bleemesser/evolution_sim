<!-- import SceneRenderer and create a scene and a sceneCanvas element -->
<script lang="ts">
  import SceneRenderer from './lib/Renderer';
  import { onMount } from 'svelte';
  // import CanvasJS from 'canvasjs';

  let sceneCanvas: HTMLCanvasElement;

  onMount(() => {
    const scene = new SceneRenderer(sceneCanvas);
    scene.spawnFood(1);
    scene.spawnCreatures(1);
    scene.render();
  });

</script>

<main>
  <canvas id="sceneCanvas" bind:this={sceneCanvas} />
  <p id="debugInfo">aasfasflaksjfa;sldfja;ldkj</p>
</main>

 