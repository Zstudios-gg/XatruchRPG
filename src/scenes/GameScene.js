import * as Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const { width, height } = this.scale

    this.add.text(width / 2, height / 2 - 30, 'XATRUCH RPG', {
      fontSize: '36px',
      color: '#c9a84c',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(width / 2, height / 2 + 20, 'ZeimStudios', {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5)
  }
}