import * as Phaser from 'phaser'
import { PlayerData } from './PlayerData.js'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.player    = null
    this.shadow    = null
    this.speed     = 120
    this.joyData   = { dx: 0, dy: 0 }
    this._moveTime = 0
    this._lastDir  = 'down'
    this._isRunning = false
    this._gender   = 'male'
  }

  preload() {
    // Mapa
    this.load.tilemapTiledJSON('pueblo', '/XatruchRPG/assets/maps/pueblo-principal.json')
    this.load.image('tiles-pixelwood', '/XatruchRPG/assets/tilesets/PixelwoodValley.png')
    this.load.image('tiles-kenney',    '/XatruchRPG/assets/tilesets/Kenney.png')

    // Personaje masculino — 288x480, frames 48x48
    this.load.spritesheet('player-male', '/XatruchRPG/assets/characters/player.png', {
      frameWidth:  48,
      frameHeight: 48
    })

    // Personaje femenino (pigman)
    this.load.spritesheet('player-female-idle', '/XatruchRPG/assets/characters/Idle__32x32_.png', {
      frameWidth:  32,
      frameHeight: 32
    })
    this.load.spritesheet('player-female-run', '/XatruchRPG/assets/characters/Run__32x32_.png', {
      frameWidth:  32,
      frameHeight: 32
    })
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

    // Si es jugador existente sin género definido, poner male por defecto
    const appearance = this.playerData.get('appearance')
    if (!appearance?.gender) {
      this.playerData.set('appearance', {
        ...(appearance || {}),
        gender: 'male'
      })
    }

    this._gender = this.playerData.get('appearance')?.gender || 'male'

    // ── MAPA ────────────────────────────────────────────────────────────────
    const map = this.make.tilemap({ key: 'pueblo' })
    const tilesetPW = map.addTilesetImage('PixelwoodValley', 'tiles-pixelwood')
    const tilesetKN = map.addTilesetImage('Kenney', 'tiles-kenney')

    const both = [tilesetPW, tilesetKN]

    this._layerSuelo      = map.createLayer('suelo',      both, 0, 0)
    this._layerDecoracion = map.createLayer('decoracion', both, 0, 0)
    this._layerObjetos    = map.createLayer('objetos',    both, 0, 0)
    this._layerColision   = map.createLayer('colisiones', both, 0, 0)

    if (this._layerColision) {
      this._layerColision.setCollisionByExclusion([-1])
      this._layerColision.setAlpha(0)
    }

    // ── POSICIÓN INICIAL ─────────────────────────────────────────────────────
    const startX = this.playerData.get('posX') || map.widthInPixels / 2
    const startY = this.playerData.get('posY') || map.heightInPixels / 2

    // ── ANIMACIONES ──────────────────────────────────────────────────────────
    if (this._gender === 'male') {
      this._createMaleAnims()
    } else {
      this._createFemaleAnims()
    }

    // ── SOMBRA ───────────────────────────────────────────────────────────────
    // this.shadow = this.add.ellipse(startX, startY + 16, 20, 8, 0x000000, 0.3)
    // this.shadow.setDepth(9)

    // ── PERSONAJE ────────────────────────────────────────────────────────────
    if (this._gender === 'male') {
      this.player = this.physics.add.sprite(startX, startY, 'player-male', 0)
      this.player.setScale(1.5)
    } else {
      this.player = this.physics.add.sprite(startX, startY, 'player-female-idle', 0)
      this.player.setScale(1.5)
    }

    this.player.setDepth(10)
    this.player.body.setCollideWorldBounds(true)
    this.player.body.setSize(20, 28)
    this.player.body.setOffset(
      this._gender === 'male' ? 14 : 6,
      this._gender === 'male' ? 18 : 4
    )

    // Iniciar animación idle
    this.player.anims.play('idle', true)

    // ── COLISIONES ───────────────────────────────────────────────────────────
    if (this._layerColision) {
      this.physics.add.collider(this.player, this._layerColision)
    }

    // ── LÍMITES DEL MUNDO ────────────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    // ── CÁMARA ───────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(1.5)

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

  // ── ANIMACIONES MASCULINO ──────────────────────────────────────────────────
  _createMaleAnims() {
    const A = this.anims
    if (A.exists('idle')) return // ya creadas

    // Fila 0 — caminar frente (frames 0-5)
    A.create({ key: 'walk-down',  frames: A.generateFrameNumbers('player-male', { start: 0,  end: 5  }), frameRate: 8,  repeat: -1 })
    // Fila 1 — caminar derecha (frames 6-11)
    A.create({ key: 'walk-right', frames: A.generateFrameNumbers('player-male', { start: 6,  end: 11 }), frameRate: 8,  repeat: -1 })
    // Fila 2 — caminar espalda (frames 12-17)
    A.create({ key: 'walk-up',    frames: A.generateFrameNumbers('player-male', { start: 12, end: 17 }), frameRate: 8,  repeat: -1 })
    // Fila 3 — correr frente (frames 18-23)
    A.create({ key: 'run-down',   frames: A.generateFrameNumbers('player-male', { start: 18, end: 23 }), frameRate: 12, repeat: -1 })
    // Fila 4 — correr derecha (frames 24-29)
    A.create({ key: 'run-right',  frames: A.generateFrameNumbers('player-male', { start: 24, end: 29 }), frameRate: 12, repeat: -1 })
    // Fila 5 — correr espalda (frames 30-35)
    A.create({ key: 'run-up',     frames: A.generateFrameNumbers('player-male', { start: 30, end: 35 }), frameRate: 12, repeat: -1 })
    // Idle — primer frame de caminar frente
    A.create({ key: 'idle',       frames: [{ key: 'player-male', frame: 0 }], frameRate: 1, repeat: -1 })
  }

  // ── ANIMACIONES FEMENINO ───────────────────────────────────────────────────
  _createFemaleAnims() {
    const A = this.anims
    if (A.exists('idle')) return

    A.create({ key: 'idle',       frames: A.generateFrameNumbers('player-female-idle', { start: 0, end: 7 }), frameRate: 8,  repeat: -1 })
    A.create({ key: 'walk-down',  frames: A.generateFrameNumbers('player-female-run',  { start: 0, end: 7 }), frameRate: 8,  repeat: -1 })
    A.create({ key: 'walk-right', frames: A.generateFrameNumbers('player-female-run',  { start: 0, end: 7 }), frameRate: 8,  repeat: -1 })
    A.create({ key: 'walk-up',    frames: A.generateFrameNumbers('player-female-run',  { start: 0, end: 7 }), frameRate: 8,  repeat: -1 })
    A.create({ key: 'run-down',   frames: A.generateFrameNumbers('player-female-run',  { start: 0, end: 7 }), frameRate: 12, repeat: -1 })
    A.create({ key: 'run-right',  frames: A.generateFrameNumbers('player-female-run',  { start: 0, end: 7 }), frameRate: 12, repeat: -1 })
    A.create({ key: 'run-up',     frames: A.generateFrameNumbers('player-female-run',  { start: 0, end: 7 }), frameRate: 12, repeat: -1 })
  }

  // ── JOYSTICK ───────────────────────────────────────────────────────────────
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

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update(time, delta) {
    if (!this.player) return

    const { dx, dy } = this.joyData
    const isMoving = dx !== 0 || dy !== 0

    // Movimiento
    this.player.setVelocity(dx * this.speed, dy * this.speed)

    // Detectar correr — más de 1.5s moviéndose
    if (isMoving) {
      this._moveTime += delta
      this._isRunning = this._moveTime > 1500
    } else {
      this._moveTime  = 0
      this._isRunning = false
    }

    // Dirección dominante
    if (isMoving) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        this._lastDir = 'right'
      } else {
        this._lastDir = dy > 0 ? 'down' : 'up'
      }
    }

    // Flip horizontal para izquierda
    if (dx < -0.1)      this.player.setFlipX(true)
    else if (dx > 0.1)  this.player.setFlipX(false)

    // Animación
    this._updateAnim(isMoving)

    // Sombra
    // this.shadow.x = this.player.x
    // this.shadow.y = this.player.y + 28
    // this.shadow.scaleX = isMoving ? 0.8 : 1

    // Guardar posición cada 5 segundos
    if (this.playerData && time % 5000 < delta) {
      this.playerData.savePosition(this.player.x, this.player.y)
    }
  }

  _updateAnim(isMoving) {
    if (!isMoving) {
      this.player.anims.play('idle', true)
      return
    }
    const prefix = this._isRunning ? 'run' : 'walk'
    this.player.anims.play(`${prefix}-${this._lastDir}`, true)
  }
}