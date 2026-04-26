import * as Phaser from 'phaser'
import { auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

export class CharacterScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterScene' })
    this._gender    = 'male'
    this._name      = ''
    this._step      = 1 // 1 = elegir PJ y nombre, 2 = login o skip
  }

  preload() {
    // Assets del splash (para que no den error al saltar a SplashScene)
    this.load.image('logo-xatruch', '/XatruchRPG/assets/logo-xatruch.png')
    this.load.image('bg-splash',    '/XatruchRPG/assets/bg-splash.jpg')

    // Sprites de personajes
    this.load.spritesheet('char-male', '/XatruchRPG/assets/characters/player.png', {
      frameWidth: 48, frameHeight: 48
    })
    this.load.spritesheet('char-female', '/XatruchRPG/assets/characters/character_02.png', {
      frameWidth: 48, frameHeight: 48
    })
  }

  create() {
    const { width, height } = this.scale

    // Fondo mientras verifica sesión
    this.add.rectangle(width / 2, height / 2, width, height, 0x050d05)
    this.add.text(width / 2, height / 2, 'Cargando...', {
      fontSize: '13px', color: '#c9a84c'
    }).setOrigin(0.5)

    // Verificar sesión primero
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.registry.set('user', user)
        this.scene.start('SplashScene')
      } else {
        this._buildStep1(width, height)
      }
    })
  }

  // ── PASO 1: ELEGIR PERSONAJE Y NOMBRE ────────────────────────────────────

  _buildStep1(width, height) {
    this.children.removeAll(true)

    // Crear animaciones
    this._createAnims()

    // Fondo
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x050d05, 0x050d05, 0x0a1a0e, 0x030a06, 1)
    bg.fillRect(0, 0, width, height)
    this._buildParticles(width, height)

    // Título
    this.add.text(width / 2, height * 0.06, 'ELIGE TU AVENTURERO', {
      fontSize: '13px', color: '#c9a84c', fontStyle: 'bold',
      letterSpacing: 3, stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5)

    const line = this.add.graphics()
    line.lineStyle(1, 0xc9a84c, 0.4)
    line.lineBetween(width * 0.1, height * 0.11, width * 0.9, height * 0.11)

    // ── PERSONAJE MASCULINO ─────────────────────────────────────────────────
    const maleX  = width * 0.28
    const femaleX = width * 0.72
    const charY  = height * 0.32

    // Fondo selección masculino
    this._maleBg = this.add.graphics()
    this._drawCharBox(this._maleBg, maleX, charY, true)

    // Sprite masculino animado (zoom x3 para que se vea bien)
    this._maleSprite = this.add.sprite(maleX, charY - 10, 'char-male', 0)
    this._maleSprite.setScale(3)
    this._maleSprite.anims.play('preview-male-walk', true)

    // Etiqueta masculino
    this.add.text(maleX, charY + 52, 'HÉROE', {
      fontSize: '11px', color: '#c9a84c', fontStyle: 'bold', letterSpacing: 2
    }).setOrigin(0.5)
    this.add.text(maleX, charY + 66, 'Guerrero de Siguatepeque', {
      fontSize: '8px', color: '#888866'
    }).setOrigin(0.5)

    // Hit area masculino
    const maleHit = this.add.rectangle(maleX, charY, 110, 130, 0x000000, 0)
    maleHit.setInteractive()
    maleHit.on('pointerdown', () => this._selectGender('male'))

    // ── PERSONAJE FEMENINO ──────────────────────────────────────────────────
    this._femaleBg = this.add.graphics()
    this._drawCharBox(this._femaleBg, femaleX, charY, false)

    this._femaleSprite = this.add.sprite(femaleX, charY - 10, 'char-female', 0)
    this._femaleSprite.setScale(3)
    this._femaleSprite.anims.play('preview-female-walk', true)

    this.add.text(femaleX, charY + 52, 'HEROÍNA', {
      fontSize: '11px', color: '#aa88cc', fontStyle: 'bold', letterSpacing: 2
    }).setOrigin(0.5)
    this.add.text(femaleX, charY + 66, 'Exploradora del Lago Yojoa', {
      fontSize: '8px', color: '#888866'
    }).setOrigin(0.5)

    const femaleHit = this.add.rectangle(femaleX, charY, 110, 130, 0x000000, 0)
    femaleHit.setInteractive()
    femaleHit.on('pointerdown', () => this._selectGender('female'))

    // ── NOMBRE ──────────────────────────────────────────────────────────────
    this.add.text(width / 2, height * 0.585, 'NOMBRE DEL AVENTURERO', {
      fontSize: '9px', color: '#888866', letterSpacing: 2
    }).setOrigin(0.5)

    const inputBg = this.add.graphics()
    inputBg.fillStyle(0x111122, 1)
    inputBg.fillRoundedRect(width * 0.12, height * 0.605, width * 0.76, 38, 8)
    inputBg.lineStyle(1, 0xc9a84c, 0.4)
    inputBg.strokeRoundedRect(width * 0.12, height * 0.605, width * 0.76, 38, 8)

    this._nameText = this.add.text(width / 2, height * 0.605 + 19, 'Toca para escribir...', {
      fontSize: '13px', color: '#666655', fontStyle: 'italic'
    }).setOrigin(0.5)

    this._setupNameInput()

    const inputHit = this.add.rectangle(width / 2, height * 0.605 + 19, width * 0.76, 38, 0x000000, 0)
    inputHit.setInteractive()
    inputHit.on('pointerdown', () => document.getElementById('name-input-rpg')?.focus())

    // ── BOTÓN CONTINUAR ─────────────────────────────────────────────────────
    const btnY   = height * 0.82
    const btnGfx = this.add.graphics()
    this._drawBtn(btnGfx, width / 2, btnY, 220, 48)

    this.add.text(width / 2, btnY, 'CONTINUAR  ▶', {
      fontSize: '14px', color: '#1a1209', fontStyle: 'bold', letterSpacing: 3
    }).setOrigin(0.5)

    const hitBtn = this.add.rectangle(width / 2, btnY, 220, 48, 0x000000, 0)
    hitBtn.setInteractive()
    hitBtn.on('pointerdown', () => this._goToStep2(width, height))

    this.tweens.add({
      targets: btnGfx, scaleX: 1.03, scaleY: 1.03,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    })

    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  // ── PASO 2: LOGIN O SKIP ──────────────────────────────────────────────────

  _goToStep2(width, height) {
    if (!this._name || this._name.length < 2) {
      this._nameText.setText('¡Necesitás un nombre!')
      this._nameText.setColor('#ff4444')
      this.tweens.add({
        targets: this._nameText,
        x: { from: this._nameText.x - 6, to: this._nameText.x + 6 },
        duration: 60, yoyo: true, repeat: 3
      })
      return
    }

    document.getElementById('name-input-rpg')?.remove()

    // Guardar selección
    this.registry.set('character', {
      name:     this._name,
      gender:   this._gender,
      skinIndex: 0,
      hairIndex: 0
    })

    // Transición al paso 2
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.children.removeAll(true)
      this._buildStep2(width, height)
      this.cameras.main.fadeIn(300, 0, 0, 0)
    })
  }

  _buildStep2(width, height) {
    // Fondo
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x050d05, 0x050d05, 0x0a1a0e, 0x030a06, 1)
    bg.fillRect(0, 0, width, height)
    this._buildParticles(width, height)

    // Logo
    if (this.textures.exists('logo-xatruch')) {
      const logo = this.add.image(width / 2, height * 0.28, 'logo-xatruch')
      logo.setDisplaySize(320, 320)
    }

    // Saludo con nombre elegido
    const char = this.registry.get('character')
    this.add.text(width / 2, height * 0.52, `¡Bienvenido, ${char?.name || 'Aventurero'}!`, {
      fontSize: '14px', color: '#c9a84c', fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.565, 'Iniciá sesión para guardar\ntu progreso en la nube', {
      fontSize: '12px', color: '#888888', align: 'center', lineSpacing: 5
    }).setOrigin(0.5)

    // ── BOTÓN GOOGLE ────────────────────────────────────────────────────────
    const btnY = height * 0.66
    const btnW = 240
    const btnH = 50

    const btnBg = this.add.graphics()
    btnBg.fillStyle(0xffffff, 1)
    btnBg.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10)

    this.add.text(width / 2 - 70, btnY, 'G', {
      fontSize: '20px', color: '#4285F4', fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(width / 2 + 16, btnY, 'Continuar con Google', {
      fontSize: '13px', color: '#333333', fontStyle: 'bold'
    }).setOrigin(0.5)

    const hitGoogle = this.add.rectangle(width / 2, btnY, btnW, btnH, 0x000000, 0)
    hitGoogle.setInteractive()
    hitGoogle.on('pointerdown', () => this.scene.start('AuthScene'))

    // ── BOTÓN SKIP ───────────────────────────────────────────────────────────
    const skipY   = height * 0.78
    const skipGfx = this.add.graphics()
    this._drawBtn(skipGfx, width / 2, skipY, 220, 46, true)

    this.add.text(width / 2, skipY, '▶   JUGAR SIN CUENTA', {
      fontSize: '12px', color: '#c9a84c', fontStyle: 'bold', letterSpacing: 2
    }).setOrigin(0.5)

    const hitSkip = this.add.rectangle(width / 2, skipY, 220, 46, 0x000000, 0)
    hitSkip.setInteractive()
    hitSkip.on('pointerdown', () => {
      this.registry.set('user', null)
      this.registry.set('isNewPlayer', true)
      this.scene.start('SplashScene')
    })

    // Botón volver
    const backText = this.add.text(width / 2, height * 0.88, '← Volver', {
      fontSize: '11px', color: '#555544', fontStyle: 'italic'
    }).setOrigin(0.5)
    backText.setInteractive()
    backText.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this._buildStep1(width, height)
        this.cameras.main.fadeIn(200, 0, 0, 0)
      })
    })
    backText.on('pointerover', () => backText.setColor('#c9a84c'))
    backText.on('pointerout',  () => backText.setColor('#555544'))
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  _createAnims() {
    const A = this.anims
    if (!A.exists('preview-male-walk')) {
      A.create({ key: 'preview-male-walk',   frames: A.generateFrameNumbers('char-male',   { start: 0, end: 5  }), frameRate: 6, repeat: -1 })
      A.create({ key: 'preview-female-walk', frames: A.generateFrameNumbers('char-female', { start: 12, end: 15 }), frameRate: 6, repeat: -1 })
    }
  }

  _selectGender(gender) {
    this._gender = gender
    this._drawCharBox(this._maleBg,   this.scale.width * 0.28, this.scale.height * 0.32, gender === 'male')
    this._drawCharBox(this._femaleBg, this.scale.width * 0.72, this.scale.height * 0.32, gender === 'female')
  }

  _drawCharBox(g, cx, cy, selected) {
    g.clear()
    g.fillStyle(selected ? 0x1a2a1a : 0x0a0a1a, 0.9)
    g.fillRoundedRect(cx - 55, cy - 65, 110, 130, 10)
    g.lineStyle(2, selected ? 0xc9a84c : 0x333355, selected ? 1 : 0.4)
    g.strokeRoundedRect(cx - 55, cy - 65, 110, 130, 10)
    if (selected) {
      // Brillo interno
      g.fillStyle(0xc9a84c, 0.05)
      g.fillRoundedRect(cx - 55, cy - 65, 110, 130, 10)
    }
  }

  _setupNameInput() {
    let input = document.getElementById('name-input-rpg')
    if (!input) {
      input = document.createElement('input')
      input.id        = 'name-input-rpg'
      input.type      = 'text'
      input.maxLength = 16
      input.style.cssText = `
        position: absolute; opacity: 0; pointer-events: none;
        width: 1px; height: 1px; top: 50%; left: 50%;
      `
      document.body.appendChild(input)
    }
    input.value = ''
    input.addEventListener('input', () => {
      this._name = input.value.trim()
      if (this._name.length > 0) {
        this._nameText.setText(this._name)
        this._nameText.setColor('#f0c84a')
        this._nameText.setStyle({ fontStyle: 'normal' })
      } else {
        this._nameText.setText('Toca para escribir...')
        this._nameText.setColor('#666655')
        this._nameText.setStyle({ fontStyle: 'italic' })
      }
    })
  }

  _drawBtn(g, cx, cy, w, h, outline = false) {
    const r = 10
    if (outline) {
      g.fillStyle(0x0a0a1a, 0.9)
      g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r)
      g.lineStyle(2, 0xc9a84c, 0.8)
      g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, r)
    } else {
      g.fillStyle(0x000000, 0.4)
      g.fillRoundedRect(cx - w / 2 + 3, cy - h / 2 + 4, w, h, r)
      g.fillStyle(0x8a6820, 1)
      g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r)
      g.fillGradientStyle(0xf0c84a, 0xe8b830, 0xc9941c, 0xb8820e, 1)
      g.fillRoundedRect(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h - 4, r - 1)
      g.fillStyle(0xffffff, 0.15)
      g.fillRoundedRect(cx - w / 2 + 4, cy - h / 2 + 3, w - 8, h / 2 - 4, { tl: r - 1, tr: r - 1, bl: 0, br: 0 })
    }
  }

  _buildParticles(width, height) {
    for (let i = 0; i < 18; i++) {
      const x   = Phaser.Math.Between(20, width - 20)
      const y   = Phaser.Math.Between(height * 0.2, height * 0.9)
      const dot = this.add.circle(x, y,
        Phaser.Math.FloatBetween(1, 2.5),
        Phaser.Utils.Array.GetRandom([0xc9a84c, 0x5aaa5a, 0x88ddaa]),
        Phaser.Math.FloatBetween(0.2, 0.6)
      )
      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(20, 50),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 5000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          dot.x = Phaser.Math.Between(20, width - 20)
          dot.y = Phaser.Math.Between(height * 0.4, height * 0.9)
          dot.alpha = Phaser.Math.FloatBetween(0.2, 0.5)
        }
      })
    }
  }
}