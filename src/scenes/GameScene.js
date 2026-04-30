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
    this._transicionando = false
    // ── TECLADO ──────────────────────────────────────────────────────────────
    this._keys     = {}   // teclas Phaser
    this._keyboardDx = 0  // dirección calculada desde WASD
    this._keyboardDy = 0
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

    // Personaje femenino (character_02)
    this.load.spritesheet('player-female', '/XatruchRPG/assets/characters/character_02.png', {
      frameWidth:  48,
      frameHeight: 48
    })
  }

  async create() {
    this._transicionando = false

    const user = this.registry.get('user')

    if (user) {
      this.playerData = new PlayerData(user.uid)
      await this.playerData.load()
      this.playerData.startAutoSave(this, 30000)
    } else {
      this.playerData = new PlayerData('guest')
    }

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

    // ── PERSONAJE ────────────────────────────────────────────────────────────
    if (this._gender === 'male') {
      this.player = this.physics.add.sprite(startX, startY, 'player-male', 0)
      this.player.setScale(1.5)
    } else {
      this.player = this.physics.add.sprite(startX, startY, 'player-female', 0)
      this.player.setScale(1.5)
    }

    this.player.setDepth(10)
    this.player.body.setCollideWorldBounds(true)
    this.player.body.setSize(20, 28)
    this.player.body.setOffset(
      this._gender === 'male' ? 14 : 6,
      this._gender === 'male' ? 18 : 4
    )

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

    // ── JOYSTICK (touch) ─────────────────────────────────────────────────────
    this.connectJoystick()

    // ── TECLADO ──────────────────────────────────────────────────────────────
    this._setupKeyboard()

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

  // ── SETUP TECLADO ──────────────────────────────────────────────────────────
  _setupKeyboard() {
    const kb = this.input.keyboard

    // Movimiento WASD
    this._keys.w = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this._keys.a = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this._keys.s = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this._keys.d = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    // Botones de acción — A B X Y
    // Usamos las teclas J K U I para mapear A B X Y
    // (evitamos conflicto con WASD; la 'A' del teclado ya es movimiento izquierda)
    this._keys.btnA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J) // J → A
    this._keys.btnB = kb.addKey(Phaser.Input.Keyboard.KeyCodes.K) // K → B
    this._keys.btnX = kb.addKey(Phaser.Input.Keyboard.KeyCodes.U) // U → X
    this._keys.btnY = kb.addKey(Phaser.Input.Keyboard.KeyCodes.I) // I → Y

    // Botones contextuales 1 2 3
    this._keys.ctx1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE)
    this._keys.ctx2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO)
    this._keys.ctx3 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE)

    // Paneles HUD
    this._keys.panelUser     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P)   // P → perfil
    this._keys.panelSettings = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC) // ESC → settings

    // ── Eventos de tecla única (oneshot) para botones HUD y acciones ─────────
    this._keys.btnA.on('down', () => this._dispatchHtmlClick('.btn-a'))
    this._keys.btnB.on('down', () => this._dispatchHtmlClick('.btn-b'))
    this._keys.btnX.on('down', () => this._dispatchHtmlClick('.btn-x'))
    this._keys.btnY.on('down', () => this._dispatchHtmlClick('.btn-y'))

    this._keys.ctx1.on('down', () => this._dispatchHtmlClick('#ctx1'))
    this._keys.ctx2.on('down', () => this._dispatchHtmlClick('#ctx2'))
    this._keys.ctx3.on('down', () => this._dispatchHtmlClick('#ctx3'))

    // Abrir panel usuario/settings vía HUDScene
    this._keys.panelUser.on('down', () => {
      const hud = this.scene.get('HUDScene')
      if (hud && hud._togglePanel) hud._togglePanel()
    })
    this._keys.panelSettings.on('down', () => {
      const hud = this.scene.get('HUDScene')
      if (hud && hud._toggleSettingsKeyboard) hud._toggleSettingsKeyboard()
    })
  }

  // Dispara un click real en un elemento HTML del DOM (botones de la UI)
  _dispatchHtmlClick(selector) {
    const el = document.querySelector(selector)
    if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  // ── ANIMACIONES MASCULINO ──────────────────────────────────────────────────
  _createMaleAnims() {
    const A = this.anims
    if (A.exists('idle')) return

    A.create({ key: 'walk-down',  frames: A.generateFrameNumbers('player-male', { start: 0,  end: 5  }), frameRate: 8,  repeat: -1 })
    A.create({ key: 'walk-right', frames: A.generateFrameNumbers('player-male', { start: 6,  end: 11 }), frameRate: 8,  repeat: -1 })
    A.create({ key: 'walk-up',    frames: A.generateFrameNumbers('player-male', { start: 12, end: 17 }), frameRate: 8,  repeat: -1 })
    A.create({ key: 'run-down',   frames: A.generateFrameNumbers('player-male', { start: 18, end: 23 }), frameRate: 12, repeat: -1 })
    A.create({ key: 'run-right',  frames: A.generateFrameNumbers('player-male', { start: 24, end: 29 }), frameRate: 12, repeat: -1 })
    A.create({ key: 'run-up',     frames: A.generateFrameNumbers('player-male', { start: 30, end: 35 }), frameRate: 12, repeat: -1 })
    A.create({ key: 'idle',       frames: [{ key: 'player-male', frame: 0 }], frameRate: 1, repeat: -1 })
  }

  // ── ANIMACIONES FEMENINO ───────────────────────────────────────────────────
  _createFemaleAnims() {
    const A = this.anims
    if (A.exists('idle')) return

    A.create({ key: 'idle',       frames: A.generateFrameNumbers('player-female', { start: 0,  end: 3  }), frameRate: 6,  repeat: -1 })
    A.create({ key: 'idle-right', frames: A.generateFrameNumbers('player-female', { start: 4,  end: 7  }), frameRate: 6,  repeat: -1 })
    A.create({ key: 'idle-up',    frames: A.generateFrameNumbers('player-female', { start: 8,  end: 11 }), frameRate: 6,  repeat: -1 })
    A.create({ key: 'walk-down',  frames: A.generateFrameNumbers('player-female', { start: 12, end: 15 }), frameRate: 8,  repeat: -1 })
    A.create({ key: 'walk-right', frames: A.generateFrameNumbers('player-female', { start: 16, end: 19 }), frameRate: 8,  repeat: -1 })
    A.create({ key: 'walk-up',    frames: A.generateFrameNumbers('player-female', { start: 20, end: 23 }), frameRate: 8,  repeat: -1 })
    A.create({ key: 'run-down',   frames: A.generateFrameNumbers('player-female', { start: 12, end: 15 }), frameRate: 14, repeat: -1 })
    A.create({ key: 'run-right',  frames: A.generateFrameNumbers('player-female', { start: 16, end: 19 }), frameRate: 14, repeat: -1 })
    A.create({ key: 'run-up',     frames: A.generateFrameNumbers('player-female', { start: 20, end: 23 }), frameRate: 14, repeat: -1 })
  }

  // ── JOYSTICK (touch) ───────────────────────────────────────────────────────
  connectJoystick() {
    const base = document.getElementById('joy-base')

    base.addEventListener('touchstart', (e) => {
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

  // ── LEER TECLADO EN UPDATE ─────────────────────────────────────────────────
  _readKeyboard() {
    let dx = 0
    let dy = 0

    if (this._keys.a?.isDown) dx -= 1
    if (this._keys.d?.isDown) dx += 1
    if (this._keys.w?.isDown) dy -= 1
    if (this._keys.s?.isDown) dy += 1

    // Normalizar diagonal
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2
      dx *= inv
      dy *= inv
    }

    this._keyboardDx = dx
    this._keyboardDy = dy
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update(time, delta) {
    if (!this.player) return

    // Leer teclado cada frame
    this._readKeyboard()

    // Combinar joystick + teclado (el que tenga mayor magnitud gana,
    // o simplemente sumamos y dejamos que Phaser maneje la velocidad)
    let dx = this.joyData.dx
    let dy = this.joyData.dy

    // Si el teclado tiene input, lo usa; si hay joystick también activo,
    // combinamos ambos (el jugador podría usar los dos a la vez en teoría)
    if (this._keyboardDx !== 0 || this._keyboardDy !== 0) {
      dx = this._keyboardDx
      dy = this._keyboardDy
    }

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

    // Guardar posición cada 5 segundos
    if (this.playerData && time % 5000 < delta) {
      this.playerData.savePosition(this.player.x, this.player.y)
    }

    // ── TRANSICIÓN AL MAPA MUNDIAL ──────────────────────────────────────────
    const mapWidth = 77 * 16
    if (this.player.x >= mapWidth - 20) {
      this._irAlMapaMundial()
    }
  }

  // ── TRANSICIÓN AL MAPA MUNDIAL ─────────────────────────────────────────────
  _irAlMapaMundial() {
    if (this._transicionando) return
    this._transicionando = true

    if (this.playerData) {
      this.playerData.savePosition(this.player.x, this.player.y)
    }

    this.cameras.main.fade(500, 0, 0, 0)
    this.time.delayedCall(500, () => {
      this.scene.stop('HUDScene')
      this.scene.start('WorldMapScene')
    })
  }

  _updateAnim(isMoving) {
    if (!isMoving) {
      if (this._gender === 'female') {
        if (this._lastDir === 'right') this.player.anims.play('idle-right', true)
        else if (this._lastDir === 'up') this.player.anims.play('idle-up', true)
        else this.player.anims.play('idle', true)
      } else {
        this.player.anims.play('idle', true)
      }
      return
    }
    const prefix = this._isRunning ? 'run' : 'walk'
    this.player.anims.play(`${prefix}-${this._lastDir}`, true)
  }
}