import './app.css'
import Scene from './Scene.svelte'

const scene = new Scene({
  target: document.getElementById('scene')!,
})

export default scene
