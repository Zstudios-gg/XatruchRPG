import * as Phaser from 'phaser'
import { auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

export class CharacterScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterScene' })
    this._gender    = 'male'
    this._name      = ''
    this._skinIndex = 0
    this._hairIndex = 0
  }

  create() {
    const { width, height } = this.scale

    // Fondo mientras verifica sesión
    this.add.rectangle(width / 2, height / 2, width, height, 0x050d05)
    this.add.text(width / 2, height / 2, 'Cargando...', {
      fontSize: '13px',
      color: '#c9a84c'
    }).setOrigin(0.5)

    // Verificar sesión primero — solo después mostrar UI
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.registry.set('user', user)
        this.scene.start('SplashScene')
      } else if (this.registry.get('character')) {
        this.scene.start('AuthScene')
      } else {
        this._buildCharacterUI(width, height)
      }
    })
  }

  _buildCharacterUI(width, height) {
    this.children.removeAll(true)

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x050d05, 0x050d05, 0x0a1a0e, 0x030a06, 1)
    bg.fillRect(0, 0, width, height)

    this._buildParticles(width, height)

    this.add.text(width / 2, height * 0.06, 'CREA TU PERSONAJE', {
      fontSize: '14px',
      color: '#c9a84c',
      fontStyle: 'bold',
      letterSpacing: 4,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5)

    const line = this.add.graphics()
    line.lineStyle(1, 0xc9a84c, 0.4)
    line.lineBetween(width * 0.15, height * 0.1, width * 0.85, height * 0.1)

    this._skinColors = [0xfdbcb4, 0xd4956a, 0x8d5524, 0x4a2912]
    this._hairColors = [0x1a0a00, 0x8B4513, 0xDAA520, 0xff6b6b, 0x4444ff, 0xffffff]
    this._previewContainer = this.add.container(width / 2, height * 0.26)
    this._buildPreview()

    this.add.text(width / 2, height * 0.42, 'GÉNERO', {
      fontSize: '10px', color: '#888866', letterSpacing: 3
    }).setOrigin(0.5)

    this._btnMale = this._makeOptionBtn(width * 0.3, height * 0.48, '♂  Masculino', true)
    this._btnMale.on('pointerdown', () => this._selectGender('male'))

    this._btnFemale = this._makeOptionBtn(width * 0.7, height * 0.48, '♀  Femenino', false)
    this._btnFemale.on('pointerdown', () => this._selectGender('female'))

    this.add.text(width / 2, height * 0.555, 'NOMBRE', {
      fontSize: '10px', color: '#888866', letterSpacing: 3
    }).setOrigin(0.5)

    const inputBg = this.add.graphics()
    inputBg.fillStyle(0x111122, 1)
    inputBg.fillRoundedRect(width * 0.15, height * 0.585, width * 0.7, 36, 8)
    inputBg.lineStyle(1, 0xc9a84c, 0.4)
    inputBg.strokeRoundedRect(width * 0.15, height * 0.585, width * 0.7, 36, 8)

    this._nameText = this.add.text(width / 2, height * 0.585 + 18, 'Toca para escribir...', {
      fontSize: '13px',
      color: '#666655',
      fontStyle: 'italic'
    }).setOrigin(0.5)

    this._setupNameInput(width, height)

    const inputHit = this.add.rectangle(width / 2, height * 0.585 + 18, width * 0.7, 36, 0x000000, 0)
    inputHit.setInteractive()
    inputHit.on('pointerdown', () => document.getElementById('name-input-rpg')?.focus())

    this.add.text(width * 0.28, height * 0.665, 'PIEL', {
      fontSize: '10px', color: '#888866', letterSpacing: 3
    }).setOrigin(0.5)

    this._skinDots = []
    this._skinColors.forEach((color, i) => {
      const dot = this._makeColorDot(width * 0.12 + i * 28, height * 0.695, color, i === 0)
      dot.on('pointerdown', () => this._selectSkin(i))
      this._skinDots.push(dot)
    })

    this.add.text(width * 0.72, height * 0.665, 'CABELLO', {
      fontSize: '10px', color: '#888866', letterSpacing: 3
    }).setOrigin(0.5)

    this._hairDots = []
    this._hairColors.forEach((color, i) => {
      const x = width * 0.52 + (i % 3) * 28
      const y = height * 0.685 + Math.floor(i / 3) * 28
      const dot = this._makeColorDot(x, y, color, i === 0)
      dot.on('pointerdown', () => this._selectHair(i))
      this._hairDots.push(dot)
    })

    const btnY = height * 0.88
    const btnGfx = this.add.graphics()
    this._drawBtn(btnGfx, width / 2, btnY, 220, 48)

    this.add.text(width / 2, btnY, 'CONTINUAR  ▶', {
      fontSize: '14px',
      color: '#1a1209',
      fontStyle: 'bold',
      letterSpacing: 3
    }).setOrigin(0.5)

    const hitBtn = this.add.rectangle(width / 2, btnY, 220, 48, 0x000000, 0)
    hitBtn.setInteractive()
    hitBtn.on('pointerdown', () => this._continue())

    this.tweens.add({
      targets: btnGfx,
      scaleX: 1.03, scaleY: 1.03,
      duration: 900, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut'
    })

    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  _buildPreview() {
    this._previewContainer.removeAll(true)
    const skin = this._skinColors[this._skinIndex]
    const hair = this._hairColors[this._hairIndex]

    this._previewContainer.add(this.add.ellipse(0, 38, 30, 10, 0x000000, 0.3))
    this._previewContainer.add(this.add.rectangle(0, 16, 28, 36, skin))
    this._previewContainer.add(this.add.rectangle(0, -14, 26, 24, skin))

    const hairShape = this._gender === 'male'
      ? this.add.rectangle(0, -24, 26, 8, hair)
      : this.add.ellipse(0, -24, 30, 14, hair)
    this._previewContainer.add(hairShape)

    this._previewContainer.add(this.add.rectangle(-6, -14, 4, 4, 0x222222))
    this._previewContainer.add(this.add.rectangle(6, -14, 4, 4, 0x222222))

    if (this._gender === 'female') {
      this._previewContainer.add(
        this.add.triangle(0, 30, -18, 0, 18, 0, 0, 22, 0x9966cc, 0.8)
      )
    }
  }

  _selectGender(gender) {
    this._gender = gender
    const isM = gender === 'male'
    this._updateOptionBtn(this._btnMale, isM)
    this._updateOptionBtn(this._btnFemale, !isM)
    this._buildPreview()
  }

  _selectSkin(index) {
    this._skinIndex = index
    this._skinDots.forEach((d, i) => this._updateDot(d, i === index))
    this._buildPreview()
  }

  _selectHair(index) {
    this._hairIndex = index
    this._hairDots.forEach((d, i) => this._updateDot(d, i === index))
    this._buildPreview()
  }

  _setupNameInput(width, height) {
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

  _continue() {
    if (!this._name || this._name.length < 2) {
      this.tweens.add({
        targets: this._nameText,
        x: { from: this._nameText.x - 6, to: this._nameText.x + 6 },
        duration: 60, yoyo: true, repeat: 3
      })
      this._nameText.setText('¡Necesitás un nombre!')
      this._nameText.setColor('#ff4444')
      return
    }

    document.getElementById('name-input-rpg')?.remove()

    this.registry.set('character', {
      name:      this._name,
      gender:    this._gender,
      skinIndex: this._skinIndex,
      hairIndex: this._hairIndex,
      skinColor: this._skinColors[this._skinIndex],
      hairColor: this._hairColors[this._hairIndex]
    })

    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('AuthScene')
    })
  }

  _makeOptionBtn(x, y, label, active) {
    const g = this.add.graphics()
    this._drawOptionBtn(g, x, y, active)
    const t = this.add.text(x, y, label, {
      fontSize: '12px',
      color: active ? '#1a1209' : '#c9a84c',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 120, 32, 0x000000, 0)
    hit.setInteractive()
    hit._gfx  = g
    hit._text = t
    return hit
  }

  _drawOptionBtn(g, x, y, active) {
    g.clear()
    g.fillStyle(active ? 0xc9a84c : 0x1a1a3a, 1)
    g.fillRoundedRect(x - 60, y - 16, 120, 32, 8)
    g.lineStyle(1, 0xc9a84c, active ? 1 : 0.4)
    g.strokeRoundedRect(x - 60, y - 16, 120, 32, 8)
  }

  _updateOptionBtn(hit, active) {
    this._drawOptionBtn(hit._gfx, hit.x, hit.y, active)
    hit._text.setColor(active ? '#1a1209' : '#c9a84c')
  }

  _makeColorDot(x, y, color, selected) {
    const g = this.add.graphics()
    g.fillStyle(color, 1)
    g.fillCircle(x, y, 10)
    if (selected) {
      g.lineStyle(2, 0xffffff, 1)
      g.strokeCircle(x, y, 12)
    }
    g._color = color
    g._x = x
    g._y = y

    const hit = this.add.circle(x, y, 14, 0x000000, 0)
    hit.setInteractive()
    hit._gfx = g
    return hit
  }

  _updateDot(hit, selected) {
    const g = hit._gfx
    g.clear()
    g.fillStyle(g._color, 1)
    g.fillCircle(g._x, g._y, 10)
    if (selected) {
      g.lineStyle(2, 0xffffff, 1)
      g.strokeCircle(g._x, g._y, 12)
    }
  }

  _drawBtn(g, cx, cy, w, h) {
    const r = 10
    g.fillStyle(0x000000, 0.5)
    g.fillRoundedRect(cx - w / 2 + 3, cy - h / 2 + 4, w, h, r)
    g.fillStyle(0x8a6820, 1)
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r)
    g.fillGradientStyle(0xf0c84a, 0xe8b830, 0xc9941c, 0xb8820e, 1)
    g.fillRoundedRect(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h - 4, r - 1)
    g.fillStyle(0xffffff, 0.15)
    g.fillRoundedRect(cx - w / 2 + 4, cy - h / 2 + 3, w - 8, h / 2 - 4, { tl: r - 1, tr: r - 1, bl: 0, br: 0 })
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