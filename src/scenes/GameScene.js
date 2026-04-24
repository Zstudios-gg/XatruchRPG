import * as Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const { width, height } = this.scale

    // Título
    this.add.text(width / 2, height / 2 - 30, 'XATRUCH RPG', {
      fontSize: '36px',
      color: '#c9a84c',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(width / 2, height / 2 + 20, 'ZeimStudios', {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // Zona del joystick — abajo a la izquierda
    const jx = 80
    const jy = height - 40

    // Base del joystick
    this.add.circle(jx, jy, 45, 0x2a2a4a, 0.9)
      .setStrokeStyle(2, 0x444466)

    // Thumb del joystick
    this.thumb = this.add.circle(jx, jy, 22, 0xc9a84c, 1)

    // Variables de control
    this.joyBase = { x: jx, y: jy }
    this.joyRadius = 45
    this.isPressed = false

    // Eventos táctiles
    this.input.on('pointerdown', (pointer) => {
      if (pointer.x < width / 2) {
        this.isPressed = true
      }
    })

    this.input.on('pointermove', (pointer) => {
      if (!this.isPressed) return
      const dx = pointer.x - this.joyBase.x
      const dy = pointer.y - this.joyBase.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < this.joyRadius) {
        this.thumb.x = pointer.x
        this.thumb.y = pointer.y
      } else {
        this.thumb.x = this.joyBase.x + (dx / dist) * this.joyRadius
        this.thumb.y = this.joyBase.y + (dy / dist) * this.joyRadius
      }
    })

    this.input.on('pointerup', () => {
      this.isPressed = false
      this.thumb.x = this.joyBase.x
      this.thumb.y = this.joyBase.y
    })
  }
}