import * as Phaser from 'phaser'
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const { width, height } = this.scale

    // Texto principal
    this.add.text(width / 2, height / 2 - 30, 'XATRUCH RPG', {
      fontSize: '36px',
      color: '#c9a84c',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(width / 2, height / 2 + 20, 'ZeimStudios', {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // Debug - muestra dimensiones para saber qué tamaño tiene la pantalla
    this.add.text(10, 10, `W:${width} H:${height}`, {
      fontSize: '14px',
      color: '#ff0000'
    })

    // Joystick en el centro exacto de la pantalla primero para verificar
    this.joystickBase = this.add.circle(width / 2, height / 2 + 100, 40, 0x2a2a4a, 0.8)
    this.joystickThumb = this.add.circle(width / 2, height / 2 + 100, 20, 0xc9a84c, 1)
  }
}