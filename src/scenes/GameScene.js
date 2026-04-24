import * as Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.player = null
    this.speed = 160
    this.joyData = { dx: 0, dy: 0 }
  }

  create() {
    const { width, height } = this.scale

    // Fondo temporal estilo mapa
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a3a1a)

    // Grid para simular el suelo
    const grid = this.add.graphics()
    grid.lineStyle(1, 0x2a4a2a, 0.5)
    for (let x = 0; x < width; x += 32) {
      grid.moveTo(x, 0)
      grid.lineTo(x, height)
    }
    for (let y = 0; y < height; y += 32) {
      grid.moveTo(0, y)
      grid.lineTo(width, y)
    }
    grid.strokePath()

    // Personaje placeholder
    this.player = this.add.rectangle(
      width / 2, height / 2, 24, 32, 0xc9a84c
    )

    // Sombra del personaje
    this.add.ellipse(
      width / 2, height / 2 + 18, 20, 8, 0x000000, 0.3
    )

    // Conectar joystick HTML con Phaser
    this.connectJoystick()
  }

  connectJoystick() {
    const base = document.getElementById('joy-base')

    base.addEventListener('touchstart', (e) => {
      const t = e.touches[0]
      const r = base.getBoundingClientRect()
      this._joyStartX = r.left + r.width / 2
      this._joyStartY = r.top + r.height / 2
      this._joyActive = true
    })

    document.addEventListener('touchmove', (e) => {
      if (!this._joyActive) return
      const t = e.touches[0]
      const dx = t.clientX - this._joyStartX
      const dy = t.clientY - this._joyStartY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const max = 22
      this.joyData.dx = dist > max ? (dx / dist) : (dx / max)
      this.joyData.dy = dist > max ? (dy / dist) : (dy / max)
    })

    document.addEventListener('touchend', () => {
      this._joyActive = false
      this.joyData.dx = 0
      this.joyData.dy = 0
    })
  }

  update(time, delta) {
    if (!this.player) return

    const dt = delta / 1000
    const { dx, dy } = this.joyData
    const { width, height } = this.scale

    this.player.x += dx * this.speed * dt
    this.player.y += dy * this.speed * dt

    // Límites de pantalla
    this.player.x = Phaser.Math.Clamp(this.player.x, 12, width - 12)
    this.player.y = Phaser.Math.Clamp(this.player.y, 16, height - 16)
  }
}