import * as Phaser from 'phaser'
import { PlayerData } from './PlayerData.js'

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldMapScene' })
    this.player      = null
    this.speed       = 80          // más lento que el pueblo, es mapa mundial
    this.joyData     = { dx: 0, dy: 0 }
    this._moveTime   = 0
    this._lastDir    = 'down'
    this._isRunning  = false
    this._gender     = 'male'
    this._map        = null
    this._layerTerreno   = null
    this._layerColision  = null
  }

  // ── PRELOAD ────────────────────────────────────────────────────────────────
  preload() {
    // Mapa mundial
    this.load.tilemapTiledJSON('mundo', '/XatruchRPG/assets/maps/Xatruch_world_map.json')
    this.load.image('tiles-mundo',      '/XatruchRPG/assets/tilesets/xatruch_tileset.png')

    // Personajes (por si viene directo a esta escena sin pasar por GameScene)
    if (!this.textures.exists('player-male')) {
      this.load.spritesheet('player-male', '/XatruchRPG/assets/characters/player.png', {
        frameWidth:  48,
        frameHeight: 48
      })
    }
    if (!this.textures.exists('player-female')) {
      this.load.spritesheet('player-female', '/XatruchRPG/assets/characters/character_02.png', {
        frameWidth:  48,
        frameHeight: 48
      })
    }
  }

  // ── CREATE ─────────────────────────────────────────────────────────────────
  async create() {
    // ── PLAYER DATA ───────────────────────────────────────────────────────────
    const user = this.registry.get('user')
    if (user) {
      this.playerData = new PlayerData(user.uid)
      await this.playerData.load()
      this.playerData.startAutoSave(this, 30000)
    } else {
      this.playerData = new PlayerData('guest')
    }

    this._gender = this.playerData.get('appearance')?.gender || 'male'

    // ── MAPA MUNDIAL ──────────────────────────────────────────────────────────
    this._map = this.make.tilemap({ key: 'mundo' })
    const tilesetMundo = this._map.addTilesetImage('xatruch_tileset', 'tiles-mundo')

    this._layerTerreno  = this._map.createLayer('terreno',    tilesetMundo, 0, 0)
    this._layerColision = this._map.createLayer('colisiones', tilesetMundo, 0, 0)

    if (this._layerColision) {
      this._layerColision.setCollisionByProperty({ collision: true })
      this._layerColision.setAlpha(0)
    }

    // ── POSICIÓN INICIAL EN EL MAPA MUNDIAL ───────────────────────────────────
    // Siguatepeque está en tile (28, 35) → en píxeles con tiles de 16px
    const defaultX = 28 * 16
    const defaultY = 35 * 16
    const startX = this.playerData.get('worldX') || defaultX
    const startY = this.playerData.get('worldY') || defaultY

    // ── ANIMACIONES ───────────────────────────────────────────────────────────
    // Solo crea animaciones si no existen ya (por si viene de GameScene)
    if (this._gender === 'male') {
      this._createMaleAnims()
    } else {
      this._createFemaleAnims()
    }

    // ── PERSONAJE ─────────────────────────────────────────────────────────────
    const spriteKey = this._gender === 'male' ? 'player-male' : 'player-female'
    this.player = this.physics.add.sprite(startX, startY, spriteKey, 0)
    this.player.setScale(1.2)   // un poco más pequeño que en el pueblo
    this.player.setDepth(10)
    this.player.body.setCollideWorldBounds(true)
    this.player.body.setSize(20, 28)
    this.player.body.setOffset(
      this._gender === 'male' ? 14 : 6,
      this._gender === 'male' ? 18 : 4
    )
    this.player.anims.play('idle', true)

    // ── COLISIONES ────────────────────────────────────────────────────────────
    if (this._layerColision) {
      this.physics.add.collider(this.player, this._layerColision)
    }

    // ── LÍMITES DEL MUNDO ─────────────────────────────────────────────────────
    this.physics.world.setBounds(
      0, 0,
      this._map.widthInPixels,
      this._map.heightInPixels
    )

    // ── CÁMARA ────────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(
      0, 0,
      this._map.widthInPixels,
      this._map.heightInPixels
    )
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(2.5)  // zoom mayor para que se vean bien los tiles pequeños

    // ── LANDMARKS (puntos de interés) ─────────────────────────────────────────
    this._setupLandmarks()

    // ── JOYSTICK ──────────────────────────────────────────────────────────────
    this.connectJoystick()

    // ── HUD ───────────────────────────────────────────────────────────────────
    if (!this.scene.isActive('HUDScene')) {
      this.scene.launch('HUDScene')
    }
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

    // ── TEXTO DE UBICACIÓN ────────────────────────────────────────────────────
    this._locationText = this.add.text(16, 16, 'Honduras', {
      fontSize: '10px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    })
    .setScrollFactor(0)  // fijo en pantalla
    .setDepth(20)
  }

  // ── LANDMARKS ──────────────────────────────────────────────────────────────
  _setupLandmarks() {
    // Puntos de interés en coordenadas de tile → píxeles
    // Basado en el JSON de landmarks con mapa 112x64 tiles de 16px
    this._landmarks = [
      { id: 'siguatepeque',               nombre: 'Siguatepeque',              tx: 28, ty: 35, radio: 32 },
      { id: 'cuevas_taulabe',             nombre: 'Cuevas de Taulabé',         tx: 27, ty: 32, radio: 24 },
      { id: 'lago_yojoa',                 nombre: 'Lago de Yojoa',             tx: 26, ty: 30, radio: 48 },
      { id: 'panacam',                    nombre: 'PANACAM',                   tx: 29, ty: 28, radio: 32 },
      { id: 'centro_historico_comayagua', nombre: 'Comayagua',                 tx: 32, ty: 37, radio: 32 },
      { id: 'catedral_comayagua',         nombre: 'Catedral de Comayagua',     tx: 32, ty: 37, radio: 16 },
      { id: 'pulhapanzak',                nombre: 'Cataratas de Pulhapanzak',  tx: 25, ty: 26, radio: 24 },
      { id: 'ruinas_copan',               nombre: 'Ruinas Mayas de Copán',     tx:  5, ty: 30, radio: 32 },
      { id: 'celaque',                    nombre: 'Cerro Las Minas - Celaque', tx: 13, ty: 36, radio: 32 },
      { id: 'omoa',                       nombre: 'Fortaleza de Omoa',         tx: 25, ty: 13, radio: 24 },
      { id: 'roatan',                     nombre: 'Roatán',                    tx: 52, ty:  3, radio: 32 },
      { id: 'biosfera_platano',           nombre: 'Biosfera Río Plátano',      tx: 85, ty: 18, radio: 48 },
      { id: 'la_tigra',                   nombre: 'Parque Nacional La Tigra',  tx: 42, ty: 42, radio: 24 },
      { id: 'tortuga_golfina',            nombre: 'Tortuga Golfina',           tx: 36, ty: 59, radio: 24 },
    ]

    // Convertir tiles a píxeles y crear zonas de detección
    this._landmarkZones = this._landmarks.map(lm => {
      const px = lm.tx * 16
      const py = lm.ty * 16
      const zone = this.add.zone(px, py, lm.radio * 2, lm.radio * 2)
      this.physics.world.enable(zone)
      zone.body.setAllowGravity(false)
      zone._landmarkData = lm
      return zone
    })
  }

  // ── DETECCIÓN DE LANDMARKS ─────────────────────────────────────────────────
  _checkLandmarkProximity() {
    if (!this.player) return

    const px = this.player.x
    const py = this.player.y
    let nearestName = 'Honduras'

    for (const lm of this._landmarks) {
      const lx = lm.tx * 16
      const ly = lm.ty * 16
      const dist = Phaser.Math.Distance.Between(px, py, lx, ly)
      if (dist < lm.radio) {
        nearestName = lm.nombre
        break
      }
    }

    if (this._locationText) {
      this._locationText.setText(nearestName)
    }
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

  // ── JOYSTICK ───────────────────────────────────────────────────────────────
  connectJoystick() {
    const base = document.getElementById('joy-base')
    if (!base) return

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

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update(time, delta) {
    if (!this.player) return

    const { dx, dy } = this.joyData
    const isMoving = dx !== 0 || dy !== 0

    // Movimiento
    this.player.setVelocity(dx * this.speed, dy * this.speed)

    // Detectar correr
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
    if (dx < -0.1)     this.player.setFlipX(true)
    else if (dx > 0.1) this.player.setFlipX(false)

    // Animación
    this._updateAnim(isMoving)

    // Detectar landmark cercano cada 30 frames
    if (time % 30 < delta) {
      this._checkLandmarkProximity()
    }

    // Guardar posición en el mapa mundial cada 5 segundos
    if (this.playerData && time % 5000 < delta) {
      this.playerData.set('worldX', this.player.x)
      this.playerData.set('worldY', this.player.y)
    }
  }

  // ── ANIMACIÓN ──────────────────────────────────────────────────────────────
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

  // ── SHUTDOWN ───────────────────────────────────────────────────────────────
  shutdown() {
    // Limpiar listeners del joystick al salir de la escena
    document.removeEventListener('touchmove', this._onTouchMove)
    document.removeEventListener('touchend',  this._onTouchEnd)
  }
}