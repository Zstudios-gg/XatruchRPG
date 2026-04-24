import * as Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.player = null
    this.shadow = null
    this.speed = 160
    this.joyData = { dx: 0, dy: 0 }
    this._bobTime = 0
  }

  create() {
    const { width, height } = this.scale

    // Fondo
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a3a1a)

    // Grid
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

    // Sombra (va antes que el personaje para quedar debajo)
    this.shadow = this.add.ellipse(
      width / 2, height / 2 + 16, 20, 8, 0x000000, 0.3
    )

    // Personaje
    this.player = this.add.rectangle(
      width / 2, height / 2, 24, 32, 0xc9a84c
    )

    this.connectJoystick()

    this.scene.launch('HUDScene')
this.hud = this.scene.get('HUDScene')
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
    const isMoving = dx !== 0 || dy !== 0

    // Movimiento
    this.player.x += dx * this.speed * dt
    this.player.y += dy * this.speed * dt

    // Límites
    this.player.x = Phaser.Math.Clamp(this.player.x, 12, width - 12)
    this.player.y = Phaser.Math.Clamp(this.player.y, 16, height - 16)

    // Bob al moverse
    if (isMoving) {
      this._bobTime += delta * 0.008
      this.player.y += Math.sin(this._bobTime) * 0.8
    }

    // Sombra sigue al personaje
    this.shadow.x = this.player.x
    this.shadow.y = this.player.y + 16
    this.shadow.scaleX = isMoving ? 0.8 : 1
  }
}