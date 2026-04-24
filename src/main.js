import * as Phaser from 'phaser'
import { CharacterScene } from './scenes/CharacterScene.js'
import { AuthScene }      from './scenes/AuthScene.js'
import { SplashScene }    from './scenes/SplashScene.js'
import { GameScene }      from './scenes/GameScene.js'
import { HUDScene }       from './scenes/HUDScene.js'

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight * 0.80,
  backgroundColor: '#000000',
  parent: 'game-container',
  scene: [CharacterScene, AuthScene, SplashScene, GameScene, HUDScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
}

new Phaser.Game(config)