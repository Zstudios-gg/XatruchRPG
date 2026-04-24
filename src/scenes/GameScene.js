import * as Phaser from 'phaser'
import { PlayerData } from './PlayerData.js'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.player = null
    this.shadow = null
    this.speed  = 160
    this.joyData = { dx: 0, dy: 0 }
    this._bobTime = 0
  }

  preload() {
    this.load.tilemapTiledJSON('siguatepeque', '/XatruchRPG/assets/maps/siguatepeque.json')
    this.load.image('tiles-grass', '/XatruchRPG/assets/tilesets/Grass.png')
  }

  async create() {
    const user = this.registry.get('user')

    if (user) {
      this.playerData = new PlayerData(user.uid)
      await this.playerData.load()
      this.playerData.startAutoSave(this, 30000)
    } else {
      this.playerData = new PlayerData('guest')
    }

    // Si es jugador nuevo, aplicar datos de creación de personaje
    if (this.registry.get('isNewPlayer')) {
      const char = this.registry.get('character')
      if (char) {
        this.playerData.set('name', char.name)
        this.playerData.set('appearance', {
          gender:    char.gender,
          skinColor: char.skinIndex,
          hairColor: char.hairIndex,
          outfit:    'default'
        })
        await this.playerData.save()
        this.registry.set('isNewPlayer', false)
      }
    }

    // ── MAPA ────────────────────────────────────────────────────────────────
    const map = this.make.tilemap({ key: 'siguatepeque' })
    const tileset = map.addTilesetImage('sprout', 'tiles-grass')

    // Capas del mapa
    this._layerSuelo    = map.createLayer('suelo', tileset, 0, 0)
    this._layerObjetos  = map.createLayer('objetos', tileset, 0, 0)
    this._layerColision = map.createLayer('colisiones', tileset, 0, 0)

    // Colisiones en la capa de colisiones
    if (this._layerColision) {
      this._layerColision.setCollisionByExclusion([-1])
      this._layerColision.setAlpha(0) // invisible — solo para colisionar
    }

    // ── PERSONAJE ────────────────────────────────────────────────────────────
    const startX = this.playerData.get('posX') || map.widthInPixels / 2
    const startY = this.playerData.get('posY') || map.heightInPixels / 2

    // Sombra
    this.shadow = this.add.ellipse(startX, startY + 16, 20, 8, 0x000000, 0.3)

    // Personaje como objeto físico
    this.player = this.physics.add.sprite(startX, startY, '__DEFAULT')
    this.player.setDisplaySize(24, 32)
    this.player.setTint(0xc9a84c)
    this.player.setDepth(10)
    this.shadow.setDepth(9)

    // Colisión entre jugador y capa de colisiones
    if (this._layerColision) {
      this.physics.add.collider(this.player, this._layerColision)
    }

    // Límites del mundo = tamaño del mapa
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.player.setCollideWorldBounds(true)

    // ── CÁMARA ───────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(2.5) // zoom para tiles de 16px

    // ── JOYSTICK ─────────────────────────────────────────────────────────────
    this.connectJoystick()

    // ── HUD ──────────────────────────────────────────────────────────────────
    this.scene.launch('HUDScene')
    this.hud = this.scene.get('HUDScene')

    this.time.delayedCall(100, () => {
      if (this.hud && this.playerData) {
        this.hud.setHP(this.playerData.get('hp'))
        this.hud.setHPMax(this.playerData.get('hpMax'))
        this.hud.setGold(this.playerData.get('gold'))
        this.hud.setStats({
          level: this.playerData.get('level'),
          xp:    this.playerData.get('xp'),
          xpMax: this.playerData.get('xpMax'),
          gems:  this.playerData.get('gems')
        })
      }
    })
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

    const { dx, dy } = this.joyData
    const isMoving = dx !== 0 || dy !== 0

    // Movimiento con física
    this.player.setVelocity(dx * this.speed, dy * this.speed)

    // Bob al moverse
    if (isMoving) {
      this._bobTime += delta * 0.008
      this.player.y += Math.sin(this._bobTime) * 0.4
    }

    // Sombra sigue al personaje
    this.shadow.x = this.player.x
    this.shadow.y = this.player.y + 14
    this.shadow.scaleX = isMoving ? 0.8 : 1

    // Guardar posición cada 5 segundos
    if (this.playerData && time % 5000 < delta) {
      this.playerData.savePosition(this.player.x, this.player.y)
    }
  }
}