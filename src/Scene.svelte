<!-- import SceneRenderer and create a scene and a sceneCanvas element -->
<script lang="ts">
  import SceneRenderer from './lib/Renderer';
  import { onMount } from 'svelte';

  let sceneCanvas: HTMLCanvasElement;

  onMount(() => {
    const scene = new SceneRenderer(sceneCanvas);
    scene.render();
  });

</script>

<main>
  <canvas id="sceneCanvas" bind:this={sceneCanvas} />
</main>

 