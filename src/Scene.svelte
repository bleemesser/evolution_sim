<!-- import SceneRenderer and create a scene and a sceneCanvas element -->
<script lang="ts">
  import SceneRenderer from './lib/Renderer';
  import { onMount } from 'svelte';
  // import CanvasJS from 'canvasjs';

  let sceneCanvas: HTMLCanvasElement;

  onMount(() => {
    const scene = new SceneRenderer(sceneCanvas);
    scene.init();
    scene.spawnFood(40);
    scene.spawnCreatures(30);
    scene.render();
  });

</script>

<main>
  <canvas id="sceneCanvas" bind:this={sceneCanvas} />
  <p id="debugInfo"></p>
  <form id="settingsForm" on:submit={
    (e) => {
      e.preventDefault();
      const foodSlider = document.getElementById('foodSlider');
      const creatureSlider = document.getElementById('creatureSlider');
      const floorSlider = document.getElementById('floorSlider');
      // @ts-ignore
      const food = parseInt(foodSlider.value);
      // @ts-ignore
      const creatures = parseInt(creatureSlider.value);
      // @ts-ignore
      const floor = parseInt(floorSlider.value);
      const scene = new SceneRenderer(sceneCanvas);
      scene.reset();
      scene.init(floor);
      scene.spawnFood(food);
      scene.spawnCreatures(creatures);
      scene.render();
    }
  
  }>
    <label for="foodSlider">Food</label>
    <input type="range" min="1" max="100" value="50" id="foodSlider" />
    <label for="creatureSlider">Creatures</label>
    <input type="range" min="1" max="100" value="50" id="creatureSlider" />
    <label for="floorSlider">Floor</label>
    <input type="range" min="5" max="25" value="15" id="floorSlider" />
  <button type="submit">Update</button>
  </form>

  
</main>

 